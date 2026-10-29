import type { ConversionErrorCode } from '@honeymelon/core';
import {
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  MATROSKA,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  WEBM,
  WebMOutputFormat,
  canEncodeVideo,
  type DiscardedTrack,
  type VideoCodec,
} from 'mediabunny';
import { fitDimensions } from './limits.js';
import {
  encoderTypes,
  videoContainers,
  type EncoderType,
  type VideoCodecName,
  type VideoContainer,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol.js';
import { sniff } from './signatures.js';
import { encodeWav, mixChannels } from './wav.js';

// Typed locally: the DOM and WebWorker libs cannot be combined in one program.
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = globalThis as unknown as WorkerScope;

class WorkerFailure extends Error {
  constructor(
    readonly code: ConversionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Contract codec names to WebCodecs codec identifiers. */
const webCodecs: Record<VideoCodecName, VideoCodec> = {
  h264: 'avc',
  hevc: 'hevc',
  vp9: 'vp9',
  av1: 'av1',
};

/** Codecs each container can hold, most compatible first. */
const containerCodecs: Record<VideoContainer, VideoCodecName[]> = {
  mp4: ['h264', 'hevc', 'av1'],
  webm: ['vp9', 'av1'],
};

const signatures: Record<EncoderType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Canvas may silently fall back to PNG; trust only the actual bytes. */
async function verified(blob: Blob, mime: EncoderType): Promise<boolean> {
  if (blob.type !== mime) {
    return false;
  }

  const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer());

  return sniff(head) === signatures[mime];
}

async function decode(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch (error) {
    if (error instanceof TypeError) {
      // Engines without the option already apply EXIF orientation.
      return createImageBitmap(source).catch(() => {
        throw new WorkerFailure(
          'invalid-input',
          'This browser could not decode the image',
        );
      });
    }

    throw new WorkerFailure(
      'invalid-input',
      'This browser could not decode the image',
    );
  }
}

/** Ask WebCodecs which codecs each container can actually be written with. */
async function videoCapabilities(): Promise<
  Record<VideoContainer, VideoCodecName[]>
> {
  const result: Record<VideoContainer, VideoCodecName[]> = {
    mp4: [],
    webm: [],
  };
  if (typeof VideoEncoder === 'undefined') {
    return result;
  }

  for (const container of videoContainers) {
    for (const name of containerCodecs[container]) {
      try {
        // A modest size keeps the probe meaningful on hardware encoders.
        if (
          await canEncodeVideo(webCodecs[name], { width: 1280, height: 720 })
        ) {
          result[container].push(name);
        }
      } catch {
        /* A probe that throws means the codec is unavailable. */
      }
    }
  }

  return result;
}

async function capabilities(): Promise<WorkerResponse> {
  const video = await videoCapabilities();
  if (
    typeof OffscreenCanvas === 'undefined' ||
    typeof createImageBitmap === 'undefined'
  ) {
    return { type: 'capabilities', offscreen: false, encoders: [], video };
  }

  const canvas = new OffscreenCanvas(2, 2);
  const context = canvas.getContext('2d');
  if (!context) {
    return { type: 'capabilities', offscreen: false, encoders: [], video };
  }

  context.fillStyle = '#808080';
  context.fillRect(0, 0, 2, 2);
  const encoders: EncoderType[] = [];
  for (const mime of encoderTypes) {
    try {
      const blob = await canvas.convertToBlob({ type: mime, quality: 0.8 });
      if (!(await verified(blob, mime))) {
        continue;
      }

      const bitmap = await createImageBitmap(blob);
      if (bitmap.width === 2 && bitmap.height === 2) {
        encoders.push(mime);
      }

      bitmap.close();
    } catch {
      /* An encoder that throws is unavailable. */
    }
  }

  return { type: 'capabilities', offscreen: true, encoders, video };
}

/** Even dimensions: most video encoders reject odd frame sizes. */
const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);

const qualities = {
  small: QUALITY_LOW,
  balanced: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
};

const discardReasons: Partial<Record<DiscardedTrack['reason'], string>> = {
  undecodable_source_codec: 'This browser cannot decode the video in this file',
  unknown_source_codec:
    'This file uses a video codec the browser does not know',
  no_encodable_target_codec:
    'This browser cannot encode the requested video codec',
};

/**
 * Transcode with WebCodecs through Mediabunny: demux, decode, resize, encode
 * and mux entirely in this worker. Terminating the worker cancels it.
 */
async function video(
  request: Extract<WorkerRequest, { type: 'video' }>,
): Promise<WorkerResponse> {
  if (typeof VideoEncoder === 'undefined') {
    throw new WorkerFailure(
      'unsupported',
      'This browser cannot encode video; use Honeymelon Desktop',
    );
  }

  const input = new Input({
    source: new BlobSource(request.source),
    // Only video containers: unused demuxers would bloat the worker.
    formats: [MP4, QTFF, MATROSKA, WEBM],
  });
  try {
    const track = await input.getPrimaryVideoTrack().catch(() => null);
    if (!track) {
      throw new WorkerFailure(
        'invalid-input',
        'This file has no video track this browser can read',
      );
    }

    const duration = await input.computeDuration();
    if (duration > request.maxSeconds) {
      throw new WorkerFailure(
        'invalid-input',
        `This ${Math.round(duration / 60)}-minute video exceeds the ${Math.round(request.maxSeconds / 60)}-minute browser limit; use Honeymelon Desktop`,
      );
    }

    const width = track.displayWidth;
    const height = track.displayHeight;
    if (width * height > request.maxPixels) {
      throw new WorkerFailure(
        'invalid-input',
        'This video frame exceeds the browser pixel limit; use Honeymelon Desktop',
      );
    }

    const size = fitDimensions(width, height, request);
    const quality = qualities[request.quality];
    const output = new Output({
      format:
        request.container === 'webm'
          ? new WebMOutputFormat()
          : new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      showWarnings: false,
      video: {
        width: even(size.width),
        height: even(size.height),
        fit: 'contain',
        quality,
        ...(request.codec ? { codec: webCodecs[request.codec] } : {}),
        ...(request.frameRate ? { frameRate: request.frameRate } : {}),
      },
      audio: request.includeAudio ? { quality } : { discard: true },
    });
    const discarded = conversion.discardedTracks.find(
      (entry) =>
        entry.reason !== 'discarded_by_user' &&
        (entry.track.isVideoTrack() || request.includeAudio),
    );
    if (!conversion.isValid || discarded) {
      const reason = discarded?.reason;
      throw new WorkerFailure(
        'unsupported',
        discarded?.track.isAudioTrack()
          ? `This browser cannot write this audio into ${request.container.toUpperCase()}; turn off Include audio or use Honeymelon Desktop`
          : ((reason && discardReasons[reason]) ??
              'This browser cannot convert this video; use Honeymelon Desktop'),
      );
    }

    conversion.onProgress = (progress) =>
      scope.postMessage({
        type: 'progress',
        value: 10 + Math.floor(progress * 85),
      });
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer?.byteLength) {
      throw new WorkerFailure(
        'conversion-failed',
        'The video encoder produced no data',
      );
    }

    return {
      type: 'result',
      blob: new Blob([buffer], { type: `video/${request.container}` }),
      width: even(size.width),
      height: even(size.height),
    };
  } finally {
    input.dispose();
  }
}

/** Scan alpha in strips so the check never doubles a large canvas. */
function usesAlpha(
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const strip = Math.max(1, Math.floor(4_000_000 / width));
  for (let y = 0; y < height; y += strip) {
    const { data } = context.getImageData(
      0,
      y,
      width,
      Math.min(strip, height - y),
    );
    for (let index = 3; index < data.length; index += 4) {
      if (data[index]! < 255) {
        return true;
      }
    }
  }

  return false;
}

async function image(
  request: Extract<WorkerRequest, { type: 'image' }>,
): Promise<WorkerResponse> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new WorkerFailure(
      'unsupported',
      'This browser cannot convert images in a background worker',
    );
  }

  const bitmap =
    request.source instanceof Blob
      ? await decode(request.source)
      : request.source;
  try {
    if (bitmap.width * bitmap.height > request.maxPixels) {
      throw new WorkerFailure(
        'invalid-input',
        `This ${Math.round((bitmap.width * bitmap.height) / 1e6)} MP image exceeds the ${Math.round(request.maxPixels / 1e6)} MP browser limit on this device; use Honeymelon Desktop`,
      );
    }

    scope.postMessage({ type: 'progress', value: 30 });
    const size = fitDimensions(bitmap.width, bitmap.height, request);
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new WorkerFailure('unsupported', 'Canvas 2D is unavailable');
    }

    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    if (request.background) {
      if (
        request.confirmFlatten &&
        usesAlpha(context, size.width, size.height)
      ) {
        throw new WorkerFailure(
          'invalid-input',
          'Confirm transparency flattening before converting',
        );
      }

      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = request.background;
      context.fillRect(0, 0, size.width, size.height);
    }

    scope.postMessage({ type: 'progress', value: 60 });
    const blob = await canvas.convertToBlob({
      type: request.mime,
      ...(request.quality === undefined ? {} : { quality: request.quality }),
    });
    if (!(await verified(blob, request.mime))) {
      throw new WorkerFailure(
        'unsupported',
        'This browser produced a different format than requested',
      );
    }

    scope.postMessage({ type: 'progress', value: 90 });
    const check = await createImageBitmap(blob);
    const matches = check.width === size.width && check.height === size.height;
    check.close();
    if (!matches) {
      throw new WorkerFailure(
        'conversion-failed',
        'Converted image failed dimension validation',
      );
    }

    return { type: 'result', blob, ...size };
  } finally {
    bitmap.close();
  }
}

function wav(request: Extract<WorkerRequest, { type: 'wav' }>): WorkerResponse {
  const channels = mixChannels(request.channels, request.outputChannels);
  scope.postMessage({ type: 'progress', value: 90 });

  return {
    type: 'result',
    blob: new Blob(
      [encodeWav(channels, request.sampleRate, request.bitDepth)],
      { type: 'audio/wav' },
    ),
  };
}

scope.onmessage = (event) => {
  const request = event.data;
  const run = async (): Promise<WorkerResponse> => {
    switch (request.type) {
      case 'capabilities':
        return capabilities();
      case 'image':
        return image(request);
      case 'wav':
        return wav(request);
      case 'video':
        return video(request);
    }
  };

  run().then(
    (response) => scope.postMessage(response),
    (error: unknown) =>
      scope.postMessage({
        type: 'error',
        code: error instanceof WorkerFailure ? error.code : 'conversion-failed',
        message: error instanceof Error ? error.message : String(error),
      }),
  );
};
