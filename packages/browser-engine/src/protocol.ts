import type { ConversionErrorCode } from '@honeymelon/core';

/** Image MIME types a canvas may be asked to encode. */
export const encoderTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
] as const;

/** A canvas encoder MIME type. */
export type EncoderType = (typeof encoderTypes)[number];

/** Video containers the browser engine can write. */
export const videoContainers = ['mp4', 'webm'] as const;

/** A writable video container. */
export type VideoContainer = (typeof videoContainers)[number];

/** Contract codec names, mapped to WebCodecs codecs inside the worker. */
export type VideoCodecName = 'h264' | 'hevc' | 'vp9' | 'av1';

/** Messages accepted by the media worker. One worker serves one request. */
export type WorkerRequest =
  | { type: 'capabilities' }
  | {
      type: 'image';
      source: Blob | ImageBitmap;
      mime: EncoderType;
      quality?: number | undefined;
      width?: number | undefined;
      height?: number | undefined;
      /** Fail rather than flatten when an alpha channel is actually used. */
      confirmFlatten: boolean;
      /** Undefined preserves alpha; otherwise composite onto this colour. */
      background?: string | undefined;
      maxPixels: number;
    }
  | {
      type: 'wav';
      channels: Float32Array[];
      sampleRate: number;
      outputChannels: 1 | 2;
      bitDepth: 16 | 24;
    }
  | {
      type: 'video';
      source: Blob;
      container: VideoContainer;
      /** Undefined lets the container choose its most compatible codec. */
      codec?: VideoCodecName | undefined;
      quality: 'small' | 'balanced' | 'high';
      /** Maximum output bounds; video is never upscaled. */
      width?: number | undefined;
      height?: number | undefined;
      frameRate?: number | undefined;
      includeAudio: boolean;
      maxSeconds: number;
      maxPixels: number;
    };

/** Messages posted back by the media worker. */
export type WorkerResponse =
  | {
      type: 'capabilities';
      offscreen: boolean;
      encoders: EncoderType[];
      /** Encodable codecs per container; an empty list means unavailable. */
      video: Record<VideoContainer, VideoCodecName[]>;
    }
  | { type: 'progress'; value: number }
  | { type: 'result'; blob: Blob; width?: number; height?: number }
  | { type: 'error'; code: ConversionErrorCode; message: string };
