/**
 * Mix decoded planar float channels to the requested layout. Mono averages
 * every source channel; stereo duplicates mono or keeps the first two.
 */
export function mixChannels(
  channels: readonly Float32Array[],
  outputChannels: 1 | 2,
): Float32Array[] {
  const [first] = channels;
  if (!first) {
    throw new Error('No decodable audio track');
  }

  if (outputChannels === 2) {
    return [first, channels[1] ?? first];
  }

  if (channels.length === 1) {
    return [first];
  }

  const mono = new Float32Array(first.length);
  for (const channel of channels) {
    for (let index = 0; index < mono.length; index++) {
      mono[index]! += (channel[index] ?? 0) / channels.length;
    }
  }

  return [mono];
}

/** Encode planar float samples as little-endian PCM RIFF/WAVE. */
export function encodeWav(
  channels: readonly Float32Array[],
  sampleRate: number,
  bitDepth: 16 | 24,
): ArrayBuffer {
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels.length * bytesPerSample;
  const dataBytes = frames * blockAlign;
  if (!channels.length || 44 + dataBytes > 0xffffffff) {
    throw new Error('Audio is too long for a WAV file');
  }

  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);

  const max = bitDepth === 16 ? 0x7fff : 0x7fffff;
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame] ?? 0));
      const value = Math.round(sample < 0 ? sample * (max + 1) : sample * max);
      if (bitDepth === 16) {
        view.setInt16(offset, value, true);
      } else {
        view.setUint8(offset, value & 0xff);
        view.setUint8(offset + 1, (value >> 8) & 0xff);
        view.setUint8(offset + 2, (value >> 16) & 0xff);
      }

      offset += bytesPerSample;
    }
  }

  return buffer;
}

/** Parse the canonical header written by {@link encodeWav}. */
export function readWavHeader(bytes: Uint8Array): {
  channels: number;
  sampleRate: number;
  bitDepth: number;
  frames: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = view.getUint16(22, true);
  const bitDepth = view.getUint16(34, true);

  return {
    channels,
    sampleRate: view.getUint32(24, true),
    bitDepth,
    frames: view.getUint32(40, true) / (channels * (bitDepth / 8)),
  };
}
