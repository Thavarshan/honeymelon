import { describe, expect, it } from 'vitest';
import { defaultLimits, deviceLimits, fitDimensions } from './limits';
import { encodeWav, mixChannels, readWavHeader } from './wav';

describe('WAV encoding', () => {
  it('writes PCM headers and clamps samples at both bit depths', () => {
    const left = Float32Array.from([0, 1, -1, 2]);
    const right = Float32Array.from([0.5, -0.5, 0, -2]);
    const sixteen = new Uint8Array(encodeWav([left, right], 22050, 16));
    expect(readWavHeader(sixteen)).toEqual({
      channels: 2,
      sampleRate: 22050,
      bitDepth: 16,
      frames: 4,
    });
    const view = new DataView(sixteen.buffer);
    expect(view.getInt16(44 + 4, true)).toBe(32767);
    expect(view.getInt16(44 + 8, true)).toBe(-32768);
    expect(view.getInt16(44 + 12, true)).toBe(32767); // clamped from 2
    const twentyFour = new Uint8Array(encodeWav([left], 48000, 24));
    expect(readWavHeader(twentyFour)).toMatchObject({
      bitDepth: 24,
      frames: 4,
    });
    expect(twentyFour.length).toBe(44 + 12);
  });

  it('downmixes to mono and duplicates mono to stereo', () => {
    const [mono] = mixChannels(
      [Float32Array.from([1, 0]), Float32Array.from([0, 1])],
      1,
    );
    expect([...mono!]).toEqual([0.5, 0.5]);
    const source = Float32Array.from([0.25]);
    expect(mixChannels([source], 2)).toEqual([source, source]);
    expect(() => mixChannels([], 2)).toThrow('No decodable audio track');
  });
});

describe('resource limits', () => {
  it('shrinks budgets on low-memory devices without changing queue size', () => {
    expect(deviceLimits(undefined)).toEqual(defaultLimits);
    expect(deviceLimits(16)).toEqual(defaultLimits);
    const small = deviceLimits(2);
    expect(small.pixels).toBe(defaultLimits.pixels / 4);
    expect(small.retainedBytes).toBe(defaultLimits.retainedBytes / 4);
    expect(small.queuedFiles).toBe(defaultLimits.queuedFiles);
    expect(deviceLimits(4).inputBytes.image).toBe(
      defaultLimits.inputBytes.image / 2,
    );
  });

  it('fits inside bounds without upscaling, like desktop', () => {
    expect(fitDimensions(4000, 2000, { width: 1000 })).toEqual({
      width: 1000,
      height: 500,
    });
    expect(fitDimensions(400, 200, { width: 1000, height: 1000 })).toEqual({
      width: 400,
      height: 200,
    });
    expect(fitDimensions(400, 200, { height: 50 })).toEqual({
      width: 100,
      height: 50,
    });
  });
});
