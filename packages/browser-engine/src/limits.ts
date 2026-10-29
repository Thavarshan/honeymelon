import type { MediaType } from '@honeymelon/contracts';

/**
 * Conservative product limits for one tab. These are not browser maxima:
 * decode buffers, canvases and encoded outputs coexist during a job.
 */
export interface ResourceLimits {
  /** Compressed bytes accepted per source file. */
  inputBytes: Record<MediaType, number>;
  /** Decoded RGBA pixels for a source image or captured frame. */
  pixels: number;
  /** Decoded float PCM bytes for one audio job. */
  pcmBytes: number;
  /** Converted outputs retained for download before the user frees them. */
  retainedBytes: number;
  /** Files admitted into one browser session. */
  queuedFiles: number;
  /** Hard deadline after which a stuck worker is terminated. */
  jobTimeoutMs: number;
}

const MiB = 1024 * 1024;

/** Defaults sized for a typical 8 GB laptop tab. */
export const defaultLimits: ResourceLimits = {
  inputBytes: { image: 100 * MiB, audio: 128 * MiB, video: 256 * MiB },
  pixels: 50_000_000,
  pcmBytes: 512 * MiB,
  retainedBytes: 512 * MiB,
  queuedFiles: 200,
  jobTimeoutMs: 5 * 60_000,
};

/**
 * Halve or quarter budgets on devices reporting little memory. Only Chromium
 * exposes `deviceMemory`; others keep defaults and rely on explicit failures.
 */
export function deviceLimits(
  memoryGiB: number | undefined,
  base: ResourceLimits = defaultLimits,
): ResourceLimits {
  if (!memoryGiB || memoryGiB >= 8) {
    return structuredClone(base);
  }

  const divisor = memoryGiB >= 4 ? 2 : 4;

  return {
    inputBytes: {
      image: base.inputBytes.image / divisor,
      audio: base.inputBytes.audio / divisor,
      video: base.inputBytes.video / divisor,
    },
    pixels: Math.floor(base.pixels / divisor),
    pcmBytes: base.pcmBytes / divisor,
    retainedBytes: base.retainedBytes / divisor,
    queuedFiles: base.queuedFiles,
    jobTimeoutMs: base.jobTimeoutMs,
  };
}

/** Human-readable size for limit messages; UI localizes everything else. */
export function formatBytes(bytes: number): string {
  return bytes >= MiB
    ? `${Math.round(bytes / MiB)} MiB`
    : `${Math.ceil(bytes / 1024)} KiB`;
}

/** Fit inside requested bounds without upscaling, mirroring desktop. */
export function fitDimensions(
  width: number,
  height: number,
  bounds: { width?: number | undefined; height?: number | undefined },
): { width: number; height: number } {
  const ratio = Math.min(
    1,
    (bounds.width ?? width) / width,
    (bounds.height ?? height) / height,
  );

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
