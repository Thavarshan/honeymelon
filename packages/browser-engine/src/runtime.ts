/** Container metadata read by the browser's media pipeline, not by parsing. */
export interface ElementMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
}

/** Decoded planar PCM owned by the caller and safe to transfer. */
export interface DecodedAudio {
  channels: Float32Array[];
  sampleRate: number;
}

/**
 * Main-thread browser media APIs. Media elements and Web Audio are not
 * available inside workers, so only bounded decode steps run here; encoding
 * stays in the worker. Injected so tests can run without a real decoder.
 */
export interface MediaRuntime {
  readonly audioDecode: boolean;
  readonly videoFrames: boolean;
  metadata(
    source: Blob,
    kind: 'audio' | 'video',
    signal: AbortSignal,
  ): Promise<ElementMetadata>;
  captureFrame(
    source: Blob,
    timestamp: number,
    signal: AbortSignal,
  ): Promise<ImageBitmap>;
  decodeAudio(
    data: ArrayBuffer,
    sampleRate: number,
    signal: AbortSignal,
  ): Promise<DecodedAudio>;
}

const abortError = () => new DOMException('Conversion canceled', 'AbortError');

/** Resolve on the first listed event; reject on media error or abort. */
function once(
  element: HTMLMediaElement,
  event: string,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const settle = (error?: Error) => {
      element.removeEventListener(event, ok);
      element.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const ok = () => settle();
    const failed = () =>
      settle(new Error('This browser could not read the media file'));
    const aborted = () => settle(abortError());
    if (signal.aborted) {
      aborted();

      return;
    }

    element.addEventListener(event, ok, { once: true });
    element.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
  });
}

async function withElement<T>(
  kind: 'audio' | 'video',
  source: Blob,
  signal: AbortSignal,
  read: (element: HTMLMediaElement) => Promise<T>,
): Promise<T> {
  const element = document.createElement(kind);
  const url = URL.createObjectURL(source);
  element.muted = true;
  element.preload = kind === 'video' ? 'auto' : 'metadata';
  try {
    const ready = once(element, 'loadedmetadata', signal);
    element.src = url;
    await ready;

    return await read(element);
  } finally {
    element.removeAttribute('src');
    element.load();
    URL.revokeObjectURL(url);
  }
}

const finite = (value: number): number | null =>
  Number.isFinite(value) && value > 0 ? value : null;

/** The production runtime using HTMLMediaElement and OfflineAudioContext. */
export function domMediaRuntime(): MediaRuntime {
  const audioDecode = typeof OfflineAudioContext !== 'undefined';
  const videoFrames =
    typeof document !== 'undefined' && typeof createImageBitmap !== 'undefined';

  return {
    audioDecode,
    videoFrames,
    metadata: (source, kind, signal) =>
      withElement(kind, source, signal, async (element) => ({
        duration: finite(element.duration),
        width:
          element instanceof HTMLVideoElement
            ? finite(element.videoWidth)
            : null,
        height:
          element instanceof HTMLVideoElement
            ? finite(element.videoHeight)
            : null,
      })),
    captureFrame: (source, timestamp, signal) =>
      withElement('video', source, signal, async (element) => {
        const video = element as HTMLVideoElement;
        if (!video.videoWidth || !video.videoHeight) {
          throw new Error('This file has no video track this browser can read');
        }

        if (Number.isFinite(video.duration) && timestamp > video.duration) {
          throw new Error(
            `Frame time ${timestamp}s is beyond the ${video.duration.toFixed(1)}s video`,
          );
        }

        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await once(video, 'loadeddata', signal);
        }

        if (timestamp > 0) {
          const seeked = once(video, 'seeked', signal);
          video.currentTime = timestamp;
          await seeked;
        }

        return createImageBitmap(video);
      }),
    decodeAudio: async (data, sampleRate, signal) => {
      signal.throwIfAborted();
      // The context's rate is the decode rate, so resampling happens here.
      const context = new OfflineAudioContext(1, 1, sampleRate);
      const aborted = new Promise<never>((_, reject) =>
        signal.addEventListener('abort', () => reject(abortError()), {
          once: true,
        }),
      );
      aborted.catch(() => {});
      // Decoding cannot be interrupted; abort abandons its result instead.
      const buffer = await Promise.race([
        context.decodeAudioData(data).catch(() => {
          throw new Error(
            'This browser could not decode an audio track in the file',
          );
        }),
        aborted,
      ]);
      signal.throwIfAborted();
      const channels = Array.from(
        { length: buffer.numberOfChannels },
        (_, i) => {
          const copy = new Float32Array(buffer.length);
          buffer.copyFromChannel(copy, i);

          return copy;
        },
      );

      return { channels, sampleRate: buffer.sampleRate };
    },
  };
}
