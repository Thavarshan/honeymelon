import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  audioSampleRate,
  imageDimensions,
  isAnimated,
  matchesExtension,
  sniff,
} from './signatures';

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(new URL(`../../e2e/fixtures/images/${name}`, import.meta.url)),
  );

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string'
        ? [...part].map((character) => character.charCodeAt(0))
        : part,
    ),
  );

const be32 = (value: number) => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];

/** Minimal PNG: signature, IHDR and optional chunks before IDAT. */
const png = (width: number, height: number, extra: string[] = []) =>
  bytes(
    '\x89PNG\r\n\x1a\n',
    be32(13),
    'IHDR',
    be32(width),
    be32(height),
    [8, 6, 0, 0, 0],
    be32(0),
    ...extra.flatMap((type) => [be32(0), type, be32(0)]),
    be32(0),
    'IDAT',
    be32(0),
  );

describe('sniffing', () => {
  it('identifies containers from content rather than names', () => {
    expect(sniff(fixture('rgb.png'))).toBe('png');
    expect(sniff(fixture('rgb.jpg'))).toBe('jpeg');
    expect(sniff(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('webp');
    expect(sniff(bytes('RIFF', [0, 0, 0, 0], 'WAVEfmt '))).toBe('wav');
    expect(sniff(bytes([0, 0, 0, 0], 'ftypavif'))).toBe('avif');
    expect(sniff(bytes([0, 0, 0, 0], 'ftypheic'))).toBe('heic');
    expect(sniff(bytes([0, 0, 0, 0], 'ftypisom'))).toBe('mp4');
    expect(sniff(bytes('GIF89a'))).toBe('gif');
    expect(sniff(bytes('fLaC'))).toBe('flac');
    expect(sniff(bytes('OggS'))).toBe('ogg');
    expect(sniff(bytes('ID3'))).toBe('mp3');
    expect(sniff(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBe('webm');
    expect(sniff(bytes('hello world'))).toBeUndefined();
  });

  it('rejects renamed or unknown files', () => {
    expect(matchesExtension('photo.PNG', 'png')).toBe(true);
    expect(matchesExtension('photo.jpeg', 'jpeg')).toBe(true);
    expect(matchesExtension('photo.png', 'jpeg')).toBe(false);
    expect(matchesExtension('notes.png', undefined)).toBe(false);
    expect(matchesExtension('clip.mov', 'mp4')).toBe(true);
    expect(matchesExtension('archive.zip', 'png')).toBe(false);
  });
});

describe('dimensions without decoding', () => {
  it('reads PNG, JPEG, GIF, BMP and WebP headers', () => {
    expect(imageDimensions(fixture('rgb.png'), 'png')).toEqual(
      imageDimensions(fixture('rgb.jpg'), 'jpeg'),
    );
    expect(imageDimensions(png(4000, 3000), 'png')).toEqual({
      width: 4000,
      height: 3000,
    });
    expect(
      imageDimensions(
        bytes(
          '\xff\xd8\xff\xe0',
          [0, 4, 0, 0],
          '\xff\xc0',
          [0, 17, 8, 0, 9, 0, 7],
        ),
        'jpeg',
      ),
    ).toEqual({ width: 7, height: 9 });
    expect(imageDimensions(bytes('GIF89a', [5, 0, 6, 0]), 'gif')).toEqual({
      width: 5,
      height: 6,
    });
    const bmp = new Uint8Array(30);
    bmp.set([66, 77]);
    bmp.set([3, 0, 0, 0], 18);
    bmp.set([254, 255, 255, 255], 22); // top-down rows store negative height
    expect(imageDimensions(bmp, 'bmp')).toEqual({ width: 3, height: 2 });
    expect(
      imageDimensions(
        bytes(
          'RIFF',
          [0, 0, 0, 0],
          'WEBPVP8X',
          [10, 0, 0, 0, 0, 0, 0, 0],
          [99, 0, 0, 49, 0, 0],
        ),
        'webp',
      ),
    ).toEqual({ width: 100, height: 50 });
  });
});

describe('animation detection', () => {
  it('flags formats a canvas would silently flatten', () => {
    expect(isAnimated(png(2, 2), 'png')).toBe(false);
    expect(isAnimated(png(2, 2, ['acTL']), 'png')).toBe(true);
    const frame = [0x2c, ...new Array<number>(9).fill(0), 2, 1, 0, 0];
    const gif = (frames: number) =>
      bytes(
        'GIF89a',
        [1, 0, 1, 0, 0, 0, 0],
        ...new Array(frames).fill(frame),
        [0x3b],
      );
    expect(isAnimated(gif(1), 'gif')).toBe(false);
    expect(isAnimated(gif(2), 'gif')).toBe(true);
    const webp = (flags: number) =>
      bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8X', [10, 0, 0, 0, flags]);
    expect(isAnimated(webp(0x10), 'webp')).toBe(false);
    expect(isAnimated(webp(0x02), 'webp')).toBe(true);
    expect(isAnimated(bytes([0, 0, 0, 0], 'ftypavis'), 'avif')).toBe(true);
  });
});

describe('audio sample rate', () => {
  it('reads stored rates so decoding does not resample silently', () => {
    const wav = bytes(
      'RIFF',
      [0, 0, 0, 0],
      'WAVEfmt ',
      [16, 0, 0, 0, 1, 0, 2, 0],
      [0x22, 0x56, 0, 0],
    );
    expect(audioSampleRate(wav, 'wav')).toBe(22050);
    expect(
      audioSampleRate(
        bytes('ID3', [4, 0, 0, 0, 0, 0, 0], [0xff, 0xfb, 0x90]),
        'mp3',
      ),
    ).toBe(44100);
    // ADTS AAC shares the sync word but uses the reserved MPEG layer.
    expect(audioSampleRate(bytes([0xff, 0xf1, 0x50]), 'mp3')).toBeUndefined();
    const opus = new Uint8Array(40);
    opus.set(bytes('OggS'));
    opus.set(bytes('OpusHead'), 28);
    expect(audioSampleRate(opus, 'ogg')).toBe(48000);
    expect(
      audioSampleRate(bytes([0, 0, 0, 0], 'ftypM4A '), 'mp4'),
    ).toBeUndefined();
  });
});
