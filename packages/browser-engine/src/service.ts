import {
  acceptsFile,
  defaultConversion,
  formats,
  type Capabilities,
  type ConversionSpec,
  type MediaMetadata,
  type MediaType,
} from '@honeymelon/contracts';
import {
  ConversionServiceError,
  QueueConversionService,
  outputFilename,
  type ConversionJob,
  type ConversionQueue,
  type ConversionRequest,
  type InputFile,
  type QueueExecutor,
} from '@honeymelon/core';
import { BrowserFileStore, type BrowserOutput } from './files.js';
import { defaultLimits, formatBytes, type ResourceLimits } from './limits.js';
import {
  videoContainers,
  type EncoderType,
  type VideoContainer,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol.js';
import { domMediaRuntime, type MediaRuntime } from './runtime.js';
import {
  audioSampleRate,
  imageDimensions,
  isAnimated,
  matchesExtension,
  sniff,
  sniffLength,
  type SniffedFormat,
} from './signatures.js';

/** Host-supplied dependencies; the host bundles the worker entry itself. */
export interface BrowserEngineOptions {
  /** Create a dedicated worker running `@honeymelon/browser-engine/worker`. */
  createWorker(): Worker;
  runtime?: MediaRuntime;
  limits?: ResourceLimits;
}

const encoders: Record<string, EncoderType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

const imageSources: readonly SniffedFormat[] = [
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'bmp',
];

const desktop = (format: string) =>
  `${format.toUpperCase()} output requires Honeymelon Desktop`;

const fail = (message: string) =>
  new ConversionServiceError('invalid-input', message);

/** Executes jobs one at a time; each job owns one short-lived worker. */
class BrowserExecutor implements QueueExecutor {
  private discovery: Promise<Capabilities> | undefined;

  constructor(
    private readonly store: BrowserFileStore,
    private readonly options: BrowserEngineOptions,
    private readonly runtime: MediaRuntime,
    private readonly limits: ResourceLimits,
  ) {}

  capabilities(): Promise<Capabilities> {
    this.discovery ??= this.discover().catch((error: unknown) => {
      this.discovery = undefined;
      throw error;
    });

    return this.discovery;
  }

  async validate(request: ConversionRequest): Promise<void> {
    for (const file of request.files) {
      if (!this.store.input(file.id)) {
        throw fail('A selected file is no longer available; add it again');
      }
    }

    const spec = request.spec ?? defaultConversion(request.mediaType);
    if (spec.kind === 'video' && spec.codec === 'prores') {
      throw new ConversionServiceError(
        'unsupported',
        'ProRes output requires Honeymelon Desktop',
      );
    }

    if (spec.kind === 'audio' && spec.track > 0) {
      throw new ConversionServiceError(
        'unsupported',
        'Browsers can extract only the first audio track',
      );
    }

    if (
      spec.kind === 'image' &&
      spec.lossless &&
      ['webp', 'avif'].includes(request.outputFormat)
    ) {
      throw new ConversionServiceError(
        'unsupported',
        `Lossless ${request.outputFormat.toUpperCase()} is unavailable in browsers`,
      );
    }
  }

  async probe(input: InputFile, signal: AbortSignal): Promise<MediaMetadata> {
    const { file, head, format } = await this.inspect(input.id);
    const metadata: MediaMetadata = {
      duration: null,
      width: null,
      height: null,
      videoCodec: null,
      frames: null,
      audio: [],
    };
    if (imageSources.includes(format) || format === 'tiff') {
      return { ...metadata, ...imageDimensions(head, format), frames: 1 };
    }

    const video = !acceptsFile('audio', file.name);
    const element = await this.runtime.metadata(
      file,
      video ? 'video' : 'audio',
      signal,
    );

    return {
      ...metadata,
      ...element,
      audio: video
        ? []
        : [
            {
              track: 0,
              codec: format,
              channels: null,
              sampleRate: audioSampleRate(head, format) ?? null,
              language: null,
            },
          ],
    };
  }

  async execute(
    job: ConversionJob,
    signal: AbortSignal,
    progress: (value: number | null) => void,
  ): Promise<void> {
    const { file, head, format } = await this.inspect(job.itemId);
    const limit = this.limits.inputBytes[job.mediaType];
    if (file.size > limit) {
      throw fail(
        `${job.name} exceeds the ${formatBytes(limit)} browser limit on this device; use Honeymelon Desktop`,
      );
    }

    signal.throwIfAborted();
    progress(5);
    const spec = job.spec ?? defaultConversion(job.mediaType);
    let blob: Blob;
    if (spec.kind === 'video') {
      blob = await this.video(job, file, spec, signal, progress);
    } else if (spec.kind === 'image') {
      blob = await this.image(job, file, head, format, spec, signal, progress);
    } else {
      blob = await this.audio(job, file, head, format, spec, signal, progress);
    }

    signal.throwIfAborted();
    const retained = this.store.retainedBytes() + blob.size;
    if (retained > this.limits.retainedBytes) {
      throw fail(
        `Converted files would exceed ${formatBytes(this.limits.retainedBytes)} of browser memory; download and remove finished files first`,
      );
    }

    this.store.setOutput(
      job.id,
      blob,
      outputFilename(job.name, job.outputFormat),
    );
  }

  async cleanup(job: ConversionJob): Promise<void> {
    this.store.deleteOutput(job.id);
  }

  private async discover(): Promise<Capabilities> {
    const probe = await this.run(
      { type: 'capabilities' },
      [],
      AbortSignal.timeout(15_000),
    );
    const available = new Set(
      probe.type === 'capabilities' ? probe.encoders : [],
    );
    const offscreen = probe.type === 'capabilities' && probe.offscreen;
    const image = formats.image.map((format) => {
      const mime = encoders[format];
      if (!mime) {
        return { format, available: false, reason: desktop(format) };
      }

      if (!offscreen) {
        return {
          format,
          available: false,
          reason: 'This browser cannot convert images in a background worker',
        };
      }

      return available.has(mime)
        ? { format, available: true }
        : {
            format,
            available: false,
            reason: `This browser has no verified ${format.toUpperCase()} encoder`,
          };
    });

    return {
      image,
      audio: formats.audio.map((format) =>
        format === 'wav' && this.runtime.audioDecode
          ? { format, available: true }
          : { format, available: false, reason: desktop(format) },
      ),
      video: formats.video.map((format) => {
        const codecs =
          probe.type === 'capabilities' &&
          videoContainers.includes(format as VideoContainer)
            ? (probe.video?.[format as VideoContainer] ?? [])
            : [];

        return codecs.length
          ? { format, available: true, codecs: [...codecs] }
          : {
              format,
              available: false,
              reason: videoContainers.includes(format as VideoContainer)
                ? `This browser has no verified ${format.toUpperCase()} video encoder`
                : desktop(format),
            };
      }),
    };
  }

  private async inspect(id: string): Promise<{
    file: File;
    head: Uint8Array;
    format: SniffedFormat;
  }> {
    const file = this.store.input(id);
    if (!file) {
      throw fail('The selected file is no longer available; add it again');
    }

    const head = new Uint8Array(await file.slice(0, sniffLength).arrayBuffer());
    const format = sniff(head);
    if (!format || !matchesExtension(file.name, format)) {
      throw fail(
        `${file.name} does not contain the media its extension describes`,
      );
    }

    return { file, head, format };
  }

  private async image(
    job: ConversionJob,
    file: File,
    head: Uint8Array,
    format: SniffedFormat,
    spec: Extract<ConversionSpec, { kind: 'image' }>,
    signal: AbortSignal,
    progress: (value: number) => void,
  ): Promise<Blob> {
    const mime = encoders[job.outputFormat];
    if (!mime) {
      throw new ConversionServiceError(
        'unsupported',
        desktop(job.outputFormat),
      );
    }

    let source: Blob | ImageBitmap = file;
    const transfer: Transferable[] = [];
    if (job.mediaType === 'image') {
      if (!imageSources.includes(format)) {
        throw new ConversionServiceError(
          'unsupported',
          `${format.toUpperCase()} images require Honeymelon Desktop`,
        );
      }

      const bytes =
        format === 'gif' ? new Uint8Array(await file.arrayBuffer()) : head;
      if (isAnimated(bytes, format)) {
        throw new ConversionServiceError(
          'unsupported',
          'Animated images require Honeymelon Desktop; browsers would keep only one frame',
        );
      }

      const size = imageDimensions(head, format);
      if (size && size.width * size.height > this.limits.pixels) {
        throw fail(
          `This ${Math.round((size.width * size.height) / 1e6)} MP image exceeds the ${Math.round(this.limits.pixels / 1e6)} MP browser limit on this device; use Honeymelon Desktop`,
        );
      }
    } else {
      const metadata = await this.runtime.metadata(file, 'video', signal);
      if (
        metadata.width &&
        metadata.height &&
        metadata.width * metadata.height > this.limits.pixels
      ) {
        throw fail('This video frame exceeds the browser pixel limit');
      }

      const frame = await this.runtime
        .captureFrame(file, spec.timestamp, signal)
        .catch(rethrow);
      source = frame;
      transfer.push(frame);
    }

    progress(15);
    const lossy = mime !== 'image/png';
    const flatten = ['jpg', 'jpeg', 'avif'].includes(job.outputFormat);
    const result = await this.run(
      {
        type: 'image',
        source,
        mime,
        quality: lossy ? spec.quality / 100 : undefined,
        width: spec.width,
        height: spec.height,
        background: flatten ? spec.background : undefined,
        confirmFlatten:
          flatten &&
          !spec.allowFlatten &&
          !(job.mediaType === 'image' && format === 'jpeg'),
        maxPixels: this.limits.pixels,
      },
      transfer,
      signal,
      progress,
    );

    return result.type === 'result' ? result.blob : new Blob();
  }

  private async audio(
    job: ConversionJob,
    file: File,
    head: Uint8Array,
    format: SniffedFormat,
    spec: Extract<ConversionSpec, { kind: 'audio' }>,
    signal: AbortSignal,
    progress: (value: number) => void,
  ): Promise<Blob> {
    if (job.outputFormat !== 'wav' || !this.runtime.audioDecode) {
      throw new ConversionServiceError(
        'unsupported',
        desktop(job.outputFormat),
      );
    }

    const kind = job.mediaType === 'video' ? 'video' : 'audio';
    const { duration } = await this.runtime.metadata(file, kind, signal);
    const sampleRate =
      spec.sampleRate ?? audioSampleRate(head, format) ?? 48000;
    // Planar float32 and a transferable copy can briefly coexist.
    const estimate = (duration ?? 0) * sampleRate * 2 * 4 * 2;
    if (estimate > this.limits.pcmBytes) {
      throw fail(
        `This ${Math.round((duration ?? 0) / 60)}-minute track exceeds the browser audio memory limit on this device; use Honeymelon Desktop`,
      );
    }

    progress(10);
    const decoded = await this.runtime
      .decodeAudio(await file.arrayBuffer(), sampleRate, signal)
      .catch(rethrow);
    const bytes = decoded.channels.reduce(
      (total, channel) => total + channel.byteLength,
      0,
    );
    if (!decoded.channels.length || !decoded.channels[0]?.length) {
      throw fail('This file has no decodable audio');
    }

    if (bytes * 2 > this.limits.pcmBytes) {
      throw fail(
        'Decoded audio exceeds the browser memory limit on this device',
      );
    }

    progress(60);
    const outputChannels =
      spec.channels ?? (decoded.channels.length > 1 ? 2 : 1);
    const result = await this.run(
      {
        type: 'wav',
        channels: decoded.channels,
        sampleRate: decoded.sampleRate,
        outputChannels,
        bitDepth: spec.bitDepth ?? 16,
      },
      decoded.channels.map((channel) => channel.buffer as ArrayBuffer),
      signal,
      progress,
    );

    return result.type === 'result' ? result.blob : new Blob();
  }

  private async video(
    job: ConversionJob,
    file: File,
    spec: Extract<ConversionSpec, { kind: 'video' }>,
    signal: AbortSignal,
    progress: (value: number) => void,
  ): Promise<Blob> {
    const container = job.outputFormat as VideoContainer;
    if (job.mediaType !== 'video' || !videoContainers.includes(container)) {
      throw new ConversionServiceError(
        'unsupported',
        desktop(job.outputFormat),
      );
    }

    const result = await this.run(
      {
        type: 'video',
        source: file,
        container,
        codec:
          spec.codec === 'default' || spec.codec === 'prores'
            ? undefined
            : spec.codec,
        quality: spec.quality,
        width: spec.width,
        height: spec.height,
        frameRate: spec.frameRate,
        includeAudio: spec.includeAudio,
        maxSeconds: this.limits.videoSeconds,
        maxPixels: this.limits.pixels,
      },
      [],
      signal,
      progress,
    );

    return result.type === 'result' ? result.blob : new Blob();
  }

  /**
   * Run one request on a fresh worker. Abort, timeout and crashes terminate
   * it, which releases its canvases, bitmaps and buffers.
   */
  private run(
    request: WorkerRequest,
    transfer: Transferable[],
    signal: AbortSignal,
    progress?: (value: number) => void,
  ): Promise<WorkerResponse> {
    signal.throwIfAborted();
    const worker = this.options.createWorker();

    return new Promise((resolve, reject) => {
      const settle = (error?: unknown, response?: WorkerResponse) => {
        clearTimeout(timer);
        signal.removeEventListener('abort', aborted);
        worker.terminate();
        if (error) {
          reject(error);
        } else {
          resolve(response!);
        }
      };

      const aborted = () =>
        settle(
          signal.reason instanceof DOMException
            ? signal.reason
            : new DOMException('Conversion canceled', 'AbortError'),
        );
      const timer = setTimeout(
        () =>
          settle(
            new ConversionServiceError(
              'conversion-failed',
              'The conversion took too long and was stopped',
            ),
          ),
        this.limits.jobTimeoutMs,
      );
      const crashed = (event: Event) => {
        event.preventDefault();
        settle(
          new ConversionServiceError(
            'conversion-failed',
            'The conversion worker stopped unexpectedly, possibly out of memory',
          ),
        );
      };

      signal.addEventListener('abort', aborted, { once: true });
      worker.onerror = crashed;
      worker.onmessageerror = crashed;
      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.type === 'progress') {
          progress?.(data.value);
        } else if (data.type === 'error') {
          settle(new ConversionServiceError(data.code, data.message));
        } else {
          settle(undefined, data);
        }
      };

      try {
        worker.postMessage(request, transfer);
      } catch (error) {
        settle(error);
      }
    });
  }
}

/** Preserve aborts; present decoder failures as invalid input. */
function rethrow(error: unknown): never {
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw error;
  }

  throw fail(error instanceof Error ? error.message : String(error));
}

/**
 * Local browser conversion over the shared queue contract. Selected files,
 * decoded media and outputs stay in this tab; nothing is uploaded, cached or
 * persisted, and no network API is used.
 */
export class BrowserConversionService extends QueueConversionService {
  private readonly files: BrowserFileStore;

  constructor(options: BrowserEngineOptions) {
    const limits = options.limits ?? defaultLimits;
    const files = new BrowserFileStore(limits.queuedFiles);
    super(
      new BrowserExecutor(
        files,
        options,
        options.runtime ?? domMediaRuntime(),
        limits,
      ),
    );
    this.files = files;
  }

  /** Register selected files; returns path-free descriptors. */
  intake(files: readonly File[]): InputFile[] {
    return files.map((file) => this.files.register(file));
  }

  /** Converted bytes and download name for a succeeded job. */
  output(jobId: string): BrowserOutput | undefined {
    return this.files.output(jobId);
  }

  /** Every converted result still held in memory. */
  outputs(): [string, BrowserOutput][] {
    return this.files.allOutputs();
  }

  /** Bytes of converted results held in memory. */
  retainedBytes(): number {
    return this.files.retainedBytes();
  }

  /** Forget a row's source handle as well as its jobs and outputs. */
  override async removeItem(itemId: string): Promise<ConversionQueue> {
    const queue = await super.removeItem(itemId);
    this.files.forget(itemId);

    return queue;
  }

  /** Forget a media view's source handles as well as jobs and outputs. */
  override async clearMedia(media: MediaType): Promise<ConversionQueue> {
    const queue = await super.clearMedia(media);
    this.files.forgetMedia(media);

    return queue;
  }

  /** Abort work, release outputs and drop every file handle. */
  override async dispose(): Promise<void> {
    try {
      await super.dispose();
    } finally {
      this.files.clear();
    }
  }
}
