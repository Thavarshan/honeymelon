import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConversionQueue } from '@honeymelon/core';
import { defaultLimits, type ResourceLimits } from './limits';
import type { WorkerRequest, WorkerResponse } from './protocol';
import type { MediaRuntime } from './runtime';
import { BrowserConversionService } from './service';
import { readWavHeader, encodeWav, mixChannels } from './wav';

/** A PNG header with the requested size and optional pre-IDAT chunks. */
function png(width: number, height: number, chunks: string[] = []) {
  const bytes: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const be32 = (value: number) =>
    bytes.push(
      value >>> 24,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    );
  const text = (value: string) =>
    bytes.push(...[...value].map((character) => character.charCodeAt(0)));
  be32(13);
  text('IHDR');
  be32(width);
  be32(height);
  bytes.push(8, 6, 0, 0, 0);
  be32(0);
  for (const type of [...chunks, 'IDAT']) {
    be32(0);
    text(type);
    be32(0);
  }

  return new Uint8Array(bytes);
}

type Handler = (request: WorkerRequest, worker: FakeWorker) => void;

/** A scripted worker: tests decide when and how each request settles. */
class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;

  onerror: ((event: Event) => void) | null = null;

  onmessageerror: ((event: Event) => void) | null = null;

  terminated = false;

  constructor(private readonly handler: Handler) {}

  postMessage(request: WorkerRequest): void {
    queueMicrotask(() => this.handler(request, this));
  }

  respond(data: WorkerResponse): void {
    if (!this.terminated) {
      this.onmessage?.({ data } as MessageEvent<WorkerResponse>);
    }
  }

  crash(): void {
    this.onerror?.(new Event('error'));
  }

  terminate(): void {
    this.terminated = true;
  }
}

const capabilities: Handler = (request, worker) => {
  if (request.type === 'capabilities') {
    worker.respond({
      type: 'capabilities',
      offscreen: true,
      encoders: ['image/png', 'image/jpeg', 'image/webp'],
      video: { mp4: ['h264'], webm: ['vp9', 'av1'] },
    });
  }
};

/** Answer capability probes, then convert everything instantly. */
const instant: Handler = (request, worker) => {
  capabilities(request, worker);
  if (request.type === 'image') {
    worker.respond({ type: 'progress', value: 50 });
    worker.respond({
      type: 'result',
      blob: new Blob([new Uint8Array(10)], { type: request.mime }),
    });
  } else if (request.type === 'wav') {
    const channels = mixChannels(request.channels, request.outputChannels);
    worker.respond({
      type: 'result',
      blob: new Blob([
        encodeWav(channels, request.sampleRate, request.bitDepth),
      ]),
    });
  }
};

const runtime = (overrides: Partial<MediaRuntime> = {}): MediaRuntime => ({
  audioDecode: true,
  videoFrames: true,
  metadata: async () => ({ duration: 1, width: 320, height: 240 }),
  captureFrame: async () => ({ close() {} }) as ImageBitmap,
  decodeAudio: async (_data, sampleRate) => ({
    channels: [new Float32Array(sampleRate), new Float32Array(sampleRate)],
    sampleRate,
  }),
  ...overrides,
});

const workers: FakeWorker[] = [];

function create(
  handler: Handler = instant,
  options: { limits?: Partial<ResourceLimits>; runtime?: MediaRuntime } = {},
) {
  return new BrowserConversionService({
    createWorker: () => {
      const worker = new FakeWorker(handler);
      workers.push(worker);

      return worker as unknown as Worker;
    },
    runtime: options.runtime ?? runtime(),
    limits: { ...defaultLimits, ...options.limits },
  });
}

async function settled(
  service: BrowserConversionService,
): Promise<ConversionQueue> {
  return vi.waitFor(async () => {
    const queue = await service.getSnapshot();
    if (
      !queue.jobs.length ||
      queue.jobs.some((job) =>
        ['queued', 'running', 'canceling'].includes(job.state),
      )
    ) {
      throw new Error('Jobs still running');
    }

    return queue;
  });
}

const pngFile = (name = 'photo.png', width = 8, height = 6) =>
  new File([png(width, height)], name, { type: 'image/png' });

const target = { id: 'downloads' };

afterEach(() => {
  workers.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('capabilities', () => {
  it('advertises only verified encoders and sends other work to desktop', async () => {
    const service = create();
    const result = await service.discoverCapabilities();
    const available = (media: keyof typeof result) =>
      result[media]
        .filter((entry) => entry.available)
        .map((entry) => entry.format);
    expect(available('image')).toEqual(['jpg', 'png', 'jpeg', 'webp']);
    expect(result.image.find((entry) => entry.format === 'avif')?.reason).toBe(
      'This browser has no verified AVIF encoder',
    );
    expect(result.image.find((entry) => entry.format === 'gif')?.reason).toBe(
      'GIF output requires Honeymelon Desktop',
    );
    expect(available('audio')).toEqual(['wav']);
    expect(available('video')).toEqual(['mp4', 'webm']);
    expect(
      result.video.find((entry) => entry.format === 'webm')?.codecs,
    ).toEqual(['vp9', 'av1']);
    expect(result.video.find((entry) => entry.format === 'mkv')?.reason).toBe(
      'MKV output requires Honeymelon Desktop',
    );
    expect(workers.every((worker) => worker.terminated)).toBe(true);
    await service.dispose();
  });

  it('disables image output when workers cannot use OffscreenCanvas', async () => {
    const service = create((request, worker) =>
      worker.respond({
        type: 'capabilities',
        offscreen: false,
        encoders: [],
        video: { mp4: [], webm: [] },
      }),
    );
    const { image } = await service.discoverCapabilities();
    expect(image.every((entry) => !entry.available)).toBe(true);
    expect(image[0]?.reason).toContain('background worker');
    await service.dispose();
  });
});

describe('image conversion', () => {
  it('converts locally, names outputs deterministically and keeps sources', async () => {
    const service = create();
    const files = service.intake([pngFile(), pngFile(), pngFile('other.png')]);
    expect(files.map((file) => file.name)).toEqual([
      'photo.png',
      'photo.png',
      'other.png',
    ]);
    await service.enqueue({
      mediaType: 'image',
      files,
      target,
      outputFormat: 'jpg',
    });
    const queue = await settled(service);
    expect(queue.jobs.map((job) => job.state)).toEqual([
      'succeeded',
      'succeeded',
      'succeeded',
    ]);
    expect(queue.jobs.map((job) => service.output(job.id)?.name)).toEqual([
      'photo.jpg',
      'photo (2).jpg',
      'other.jpg',
    ]);
    expect(service.retainedBytes()).toBe(30);
    const request = workers
      .map((worker) => worker)
      .find((worker) => worker.terminated);
    expect(request).toBeDefined();
    await service.dispose();
    expect(service.outputs()).toEqual([]);
  });

  it('passes quality, bounds and flattening settings to the worker', async () => {
    const requests: WorkerRequest[] = [];
    const service = create((request, worker) => {
      requests.push(request);
      instant(request, worker);
    });
    await service.enqueue({
      mediaType: 'image',
      files: service.intake([pngFile()]),
      target,
      outputFormat: 'jpg',
      spec: {
        kind: 'image',
        quality: 70,
        lossless: false,
        width: 100,
        timestamp: 0,
        allowFlatten: false,
        background: '#000000',
      },
    });
    await settled(service);
    expect(requests.find((request) => request.type === 'image')).toMatchObject({
      mime: 'image/jpeg',
      quality: 0.7,
      width: 100,
      background: '#000000',
      confirmFlatten: true,
    });
    await service.dispose();
  });

  it.each([
    [
      'renamed files',
      new File(['not an image'], 'fake.png'),
      'does not contain the media its extension describes',
    ],
    [
      'animated images',
      new File([png(2, 2, ['acTL'])], 'moving.png'),
      'Animated images require Honeymelon Desktop',
    ],
    [
      'oversized images before decoding',
      pngFile('huge.png', 20_000, 20_000),
      '400 MP image exceeds the 50 MP browser limit',
    ],
  ])('fails %s with an actionable message', async (_label, file, message) => {
    const service = create();
    await service.enqueue({
      mediaType: 'image',
      files: service.intake([file]),
      target,
      outputFormat: 'jpg',
    });
    const [job] = (await settled(service)).jobs;
    expect(job?.state).toBe('failed');
    expect(job?.error?.message).toContain(message);
    expect(workers.filter((worker) => !worker.terminated)).toEqual([]);
    await service.dispose();
  });

  it('rejects unsupported settings before creating jobs', async () => {
    const service = create();
    await expect(
      service.enqueue({
        mediaType: 'image',
        files: service.intake([pngFile()]),
        target,
        outputFormat: 'gif',
      }),
    ).rejects.toMatchObject({ code: 'unsupported' });
    await expect(
      service.enqueue({
        mediaType: 'image',
        files: service.intake([pngFile()]),
        target,
        outputFormat: 'webp',
        spec: {
          kind: 'image',
          quality: 85,
          lossless: true,
          timestamp: 0,
          allowFlatten: false,
          background: '#ffffff',
        },
      }),
    ).rejects.toThrow('Lossless WEBP is unavailable in browsers');
    await expect(
      service.enqueue({
        mediaType: 'image',
        files: [{ id: 'forged', name: 'photo.png', sizeBytes: 1 }],
        target,
        outputFormat: 'png',
      }),
    ).rejects.toMatchObject({ code: 'invalid-input' });
    expect((await service.getSnapshot()).jobs).toEqual([]);
    await service.dispose();
  });

  it('terminates the worker on cancel and never returns a partial output', async () => {
    const service = create((request, worker) => {
      capabilities(request, worker);
      if (request.type === 'image') {
        worker.respond({ type: 'progress', value: 30 });
      }
    });
    const queue = await service.enqueue({
      mediaType: 'image',
      files: service.intake([pngFile(), pngFile('second.png')]),
      target,
      outputFormat: 'png',
    });
    await vi.waitFor(async () =>
      expect((await service.getSnapshot()).jobs[0]?.progress).toBe(30),
    );
    expect(await service.cancelBatch(queue.batches[0]!.id)).toEqual({
      status: 'canceled',
    });
    const after = await service.getSnapshot();
    expect(after.jobs.map((job) => job.state)).toEqual([
      'canceled',
      'canceled',
    ]);
    expect(workers.every((worker) => worker.terminated)).toBe(true);
    expect(service.outputs()).toEqual([]);
    await service.dispose();
  });

  it('turns worker crashes and timeouts into failed jobs and continues', async () => {
    let calls = 0;
    const service = create(
      (request, worker) => {
        capabilities(request, worker);
        if (request.type === 'image' && calls++ === 0) {
          worker.crash();
        } else if (request.type === 'image' && calls === 2) {
          // Never answers: the job deadline must stop it.
        } else {
          instant(request, worker);
        }
      },
      { limits: { jobTimeoutMs: 50 } },
    );
    await service.enqueue({
      mediaType: 'image',
      files: service.intake([
        pngFile('a.png'),
        pngFile('b.png'),
        pngFile('c.png'),
      ]),
      target,
      outputFormat: 'png',
    });
    const queue = await settled(service);
    expect(queue.jobs.map((job) => job.state)).toEqual([
      'failed',
      'failed',
      'succeeded',
    ]);
    expect(queue.jobs[0]?.error?.message).toContain('stopped unexpectedly');
    expect(queue.jobs[1]?.error?.message).toContain('took too long');
    expect(workers.every((worker) => worker.terminated)).toBe(true);
    await service.dispose();
  });

  it('refuses to retain more output than the memory budget', async () => {
    const service = create(instant, { limits: { retainedBytes: 15 } });
    await service.enqueue({
      mediaType: 'image',
      files: service.intake([pngFile('a.png'), pngFile('b.png')]),
      target,
      outputFormat: 'png',
    });
    const queue = await settled(service);
    expect(queue.jobs.map((job) => job.state)).toEqual(['succeeded', 'failed']);
    expect(queue.jobs[1]?.error?.message).toContain('download and remove');
    await service.removeItem(queue.jobs[0]!.itemId);
    expect(service.retainedBytes()).toBe(0);
    await service.dispose();
  });

  it('bounds the number of files held by one tab', () => {
    const service = create(instant, { limits: { queuedFiles: 2 } });
    service.intake([pngFile(), pngFile()]);
    expect(() => service.intake([pngFile()])).toThrow('up to 2 files');
    void service.dispose();
  });

  it('probes image headers without decoding pixels', async () => {
    const service = create();
    const [file] = service.intake([pngFile('photo.png', 640, 480)]);
    expect(await service.probe(file!)).toMatchObject({
      width: 640,
      height: 480,
      frames: 1,
    });
    expect(workers).toEqual([]);
    await service.dispose();
  });
});

describe('audio and video', () => {
  const wavFile = (seconds = 1, sampleRate = 22050) =>
    new File(
      [encodeWav([new Float32Array(seconds * sampleRate)], sampleRate, 16)],
      'tone.wav',
    );

  it('decodes at the source rate and writes WAV with requested layout', async () => {
    const decode = vi.fn<MediaRuntime['decodeAudio']>(async (_data, rate) => ({
      channels: [new Float32Array(rate), new Float32Array(rate)],
      sampleRate: rate,
    }));
    const service = create(instant, {
      runtime: runtime({ decodeAudio: decode }),
    });
    await service.enqueue({
      mediaType: 'audio',
      files: service.intake([wavFile()]),
      target,
      outputFormat: 'wav',
      spec: {
        kind: 'audio',
        codec: 'default',
        channels: 1,
        bitDepth: 24,
        track: 0,
      },
    });
    const [job] = (await settled(service)).jobs;
    expect(job?.state).toBe('succeeded');
    expect(decode.mock.calls[0]?.[1]).toBe(22050);
    const output = service.output(job!.id)!;
    expect(output.name).toBe('tone.wav');
    expect(
      readWavHeader(new Uint8Array(await output.blob.arrayBuffer())),
    ).toEqual({ channels: 1, sampleRate: 22050, bitDepth: 24, frames: 22050 });
    await service.dispose();
  });

  it('refuses long tracks before decoding them into memory', async () => {
    const decode = vi.fn<MediaRuntime['decodeAudio']>();
    const service = create(instant, {
      runtime: runtime({
        decodeAudio: decode,
        metadata: async () => ({
          duration: 3 * 3600,
          width: null,
          height: null,
        }),
      }),
    });
    await service.enqueue({
      mediaType: 'audio',
      files: service.intake([wavFile()]),
      target,
      outputFormat: 'wav',
    });
    const [job] = (await settled(service)).jobs;
    expect(job?.error?.message).toContain('180-minute track exceeds');
    expect(decode).not.toHaveBeenCalled();
    await service.dispose();
  });

  it('reports files without a decodable audio track', async () => {
    const service = create(instant, {
      runtime: runtime({
        decodeAudio: async () => {
          throw new Error(
            'This browser could not decode an audio track in the file',
          );
        },
      }),
    });
    await service.enqueue({
      mediaType: 'audio',
      files: service.intake([wavFile()]),
      target,
      outputFormat: 'wav',
    });
    expect((await settled(service)).jobs[0]?.error?.message).toContain(
      'could not decode an audio track',
    );
    await service.dispose();
  });

  it('captures a video frame and sends the bitmap to the image worker', async () => {
    const capture = vi.fn<MediaRuntime['captureFrame']>(
      async () => ({ close() {} }) as ImageBitmap,
    );
    const requests: WorkerRequest[] = [];
    const service = create(
      (request, worker) => {
        requests.push(request);
        instant(request, worker);
      },
      { runtime: runtime({ captureFrame: capture }) },
    );
    const webm = new File(
      [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])],
      'clip.webm',
    );
    await service.enqueue({
      mediaType: 'video',
      files: service.intake([webm]),
      target,
      outputFormat: 'png',
      spec: {
        kind: 'image',
        quality: 85,
        lossless: false,
        timestamp: 2,
        allowFlatten: false,
        background: '#ffffff',
      },
    });
    const [job] = (await settled(service)).jobs;
    expect(job?.state).toBe('succeeded');
    expect(capture.mock.calls[0]?.[1]).toBe(2);
    expect(service.output(job!.id)?.name).toBe('clip.png');
    expect(requests.find((request) => request.type === 'image')).toMatchObject({
      mime: 'image/png',
      quality: undefined,
    });
    await service.dispose();
  });

  it('transcodes video with the requested settings and bounded duration', async () => {
    const requests: WorkerRequest[] = [];
    const service = create((request, worker) => {
      requests.push(request);
      capabilities(request, worker);
      if (request.type === 'video') {
        worker.respond({ type: 'progress', value: 40 });
        worker.respond({
          type: 'result',
          blob: new Blob([new Uint8Array(32)], { type: 'video/mp4' }),
        });
      }
    });
    const webm = new File(
      [new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])],
      'clip.webm',
    );
    await service.enqueue({
      mediaType: 'video',
      files: service.intake([webm]),
      target,
      outputFormat: 'mp4',
      spec: {
        kind: 'video',
        codec: 'h264',
        quality: 'high',
        speed: 'medium',
        width: 640,
        includeAudio: false,
      },
    });
    const [job] = (await settled(service)).jobs;
    expect(job?.state).toBe('succeeded');
    expect(service.output(job!.id)?.name).toBe('clip.mp4');
    expect(requests.find((request) => request.type === 'video')).toMatchObject({
      container: 'mp4',
      codec: 'h264',
      quality: 'high',
      width: 640,
      includeAudio: false,
      maxSeconds: defaultLimits.videoSeconds,
    });
    await service.dispose();
  });

  it('rejects video formats and codecs the browser has not verified', async () => {
    const service = create();
    const clip = () =>
      service.intake([new File([new Uint8Array(4)], 'clip.webm')]);
    await expect(
      service.enqueue({
        mediaType: 'video',
        files: clip(),
        target,
        outputFormat: 'mov',
      }),
    ).rejects.toThrow('Output encoder unavailable');
    await expect(
      service.enqueue({
        mediaType: 'video',
        files: clip(),
        target,
        outputFormat: 'mp4',
        spec: {
          kind: 'video',
          codec: 'prores',
          quality: 'balanced',
          speed: 'medium',
          includeAudio: true,
        },
      }),
    ).rejects.toThrow('Requested codec is unavailable');
    await service.dispose();
  });
});

it('uses no network API while probing and converting', async () => {
  const blocked = () => {
    throw new Error('Network use is forbidden');
  };

  vi.stubGlobal('fetch', blocked);
  vi.stubGlobal('XMLHttpRequest', blocked);
  vi.stubGlobal('WebSocket', blocked);
  vi.stubGlobal('EventSource', blocked);
  vi.stubGlobal('navigator', { sendBeacon: blocked });
  const service = create();
  const files = service.intake([pngFile()]);
  await service.probe(files[0]!);
  await service.enqueue({
    mediaType: 'image',
    files,
    target,
    outputFormat: 'png',
  });
  expect((await settled(service)).jobs[0]?.state).toBe('succeeded');
  await service.dispose();
});
