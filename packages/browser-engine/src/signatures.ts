/** A container or codec recognized from leading bytes, not the filename. */
export type SniffedFormat =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'bmp'
  | 'tiff'
  | 'heic'
  | 'wav'
  | 'flac'
  | 'mp3'
  | 'ogg'
  | 'aiff'
  | 'mp4'
  | 'webm';

/** Leading bytes needed by every sniffer and dimension reader below. */
export const sniffLength = 64 * 1024;

const ascii = (bytes: Uint8Array, offset: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

/** Identify a supported container from its signature. */
export function sniff(bytes: Uint8Array): SniffedFormat | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') {
    return 'png';
  }

  if (ascii(bytes, 0, 4) === 'RIFF') {
    const kind = ascii(bytes, 8, 4);
    if (kind === 'WEBP') {
      return 'webp';
    }

    if (kind === 'WAVE') {
      return 'wav';
    }
  }

  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return 'avif';
    }

    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1'].includes(brand)) {
      return 'heic';
    }

    return 'mp4';
  }

  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') {
    return 'gif';
  }

  if (ascii(bytes, 0, 2) === 'BM') {
    return 'bmp';
  }

  if (ascii(bytes, 0, 4) === 'II*\0' || ascii(bytes, 0, 4) === 'MM\0*') {
    return 'tiff';
  }

  if (ascii(bytes, 0, 4) === 'fLaC') {
    return 'flac';
  }

  if (ascii(bytes, 0, 4) === 'OggS') {
    return 'ogg';
  }

  if (ascii(bytes, 0, 4) === 'FORM' && /^AIF[FC]$/.test(ascii(bytes, 8, 4))) {
    return 'aiff';
  }

  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'webm';
  }

  if (
    ascii(bytes, 0, 3) === 'ID3' ||
    (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
  ) {
    return 'mp3';
  }

  return undefined;
}

const extensionFormats: Record<string, readonly SniffedFormat[]> = {
  jpg: ['jpeg'],
  jpeg: ['jpeg'],
  png: ['png'],
  webp: ['webp'],
  avif: ['avif'],
  gif: ['gif'],
  bmp: ['bmp'],
  tif: ['tiff'],
  tiff: ['tiff'],
  wav: ['wav'],
  flac: ['flac'],
  mp3: ['mp3'],
  ogg: ['ogg'],
  oga: ['ogg'],
  opus: ['ogg', 'webm'],
  aif: ['aiff'],
  aiff: ['aiff'],
  m4a: ['mp4'],
  aac: ['mp3', 'mp4'],
  mp4: ['mp4'],
  m4v: ['mp4'],
  mov: ['mp4'],
  webm: ['webm'],
  mkv: ['webm'],
};

/**
 * Compare declared and actual contents. Unknown extensions are rejected so a
 * renamed file never reaches a decoder under a misleading label.
 */
export function matchesExtension(
  name: string,
  format: SniffedFormat | undefined,
): boolean {
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';

  return !!format && !!extensionFormats[extension]?.includes(format);
}

const u16 = (bytes: Uint8Array, offset: number, little: boolean): number =>
  little
    ? (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
    : ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);

const u32 = (bytes: Uint8Array, offset: number, little: boolean): number =>
  little
    ? (u16(bytes, offset, true) | (u16(bytes, offset + 2, true) << 16)) >>> 0
    : ((u16(bytes, offset, false) << 16) | u16(bytes, offset + 2, false)) >>> 0;

const u24le = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] ?? 0) |
  ((bytes[offset + 1] ?? 0) << 8) |
  ((bytes[offset + 2] ?? 0) << 16);

/** Read stored image dimensions without decoding pixels, where possible. */
export function imageDimensions(
  bytes: Uint8Array,
  format: SniffedFormat,
): { width: number; height: number } | undefined {
  switch (format) {
    case 'png':
      return ascii(bytes, 12, 4) === 'IHDR'
        ? { width: u32(bytes, 16, false), height: u32(bytes, 20, false) }
        : undefined;
    case 'gif':
      return { width: u16(bytes, 6, true), height: u16(bytes, 8, true) };
    case 'bmp':
      return {
        width: Math.abs(u32(bytes, 18, true) | 0),
        height: Math.abs(u32(bytes, 22, true) | 0),
      };
    case 'webp': {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === 'VP8 ') {
        return {
          width: u16(bytes, 26, true) & 0x3fff,
          height: u16(bytes, 28, true) & 0x3fff,
        };
      }

      if (chunk === 'VP8L') {
        const bits = u32(bytes, 21, true);

        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }

      return chunk === 'VP8X'
        ? { width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 }
        : undefined;
    }

    case 'jpeg': {
      let offset = 2;
      while (offset + 9 <= bytes.length) {
        if (bytes[offset] !== 0xff) {
          return undefined;
        }

        const marker = bytes[offset + 1] ?? 0;
        // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC).
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          ![0xc4, 0xc8, 0xcc].includes(marker)
        ) {
          return {
            height: u16(bytes, offset + 5, false),
            width: u16(bytes, offset + 7, false),
          };
        }

        offset += 2 + u16(bytes, offset + 2, false);
      }

      return undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Detect animation that a canvas would silently flatten to one frame.
 * Callers must pass the whole file for GIF, since frames follow image data.
 */
export function isAnimated(bytes: Uint8Array, format: SniffedFormat): boolean {
  if (format === 'webp') {
    return ascii(bytes, 12, 4) === 'VP8X' && ((bytes[20] ?? 0) & 0x02) !== 0;
  }

  if (format === 'png') {
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const type = ascii(bytes, offset + 4, 4);
      if (type === 'acTL') {
        return true;
      }

      if (type === 'IDAT') {
        return false;
      }

      offset += 12 + u32(bytes, offset, false);
    }

    return false;
  }

  if (format === 'gif') {
    return gifFrames(bytes) > 1;
  }

  return format === 'avif' && ascii(bytes, 8, 4) === 'avis';
}

function gifFrames(bytes: Uint8Array): number {
  const flags = bytes[10] ?? 0;
  let offset = 13 + (flags & 0x80 ? 3 * 2 ** ((flags & 0x07) + 1) : 0);
  let frames = 0;
  const skipBlocks = () => {
    while (offset < bytes.length) {
      const size = bytes[offset++] ?? 0;
      if (!size) {
        return;
      }

      offset += size;
    }
  };

  while (offset < bytes.length) {
    const block = bytes[offset++];
    if (block === 0x3b) {
      break;
    }

    if (block === 0x21) {
      offset++;
      skipBlocks();
    } else if (block === 0x2c) {
      frames++;
      if (frames > 1) {
        break;
      }

      const local = bytes[offset + 8] ?? 0;
      offset += 9 + (local & 0x80 ? 3 * 2 ** ((local & 0x07) + 1) : 0);
      offset++; // LZW minimum code size
      skipBlocks();
    } else {
      break;
    }
  }

  return frames;
}

/**
 * Read the stored sample rate so decoding does not silently resample.
 * Returns undefined when the container needs a full demuxer.
 */
export function audioSampleRate(
  bytes: Uint8Array,
  format: SniffedFormat,
): number | undefined {
  switch (format) {
    case 'wav': {
      let offset = 12;
      while (offset + 16 <= bytes.length) {
        if (ascii(bytes, offset, 4) === 'fmt ') {
          return u32(bytes, offset + 12, true);
        }

        offset +=
          8 + u32(bytes, offset + 4, true) + (u32(bytes, offset + 4, true) % 2);
      }

      return undefined;
    }

    case 'flac':
      // STREAMINFO: 20-bit sample rate after min/max block and frame sizes.
      return (
        ((bytes[18] ?? 0) << 12) |
        ((bytes[19] ?? 0) << 4) |
        ((bytes[20] ?? 0) >> 4)
      );
    case 'ogg': {
      const header = ascii(bytes, 28, 8);
      if (header === 'OpusHead') {
        return 48000;
      }

      return ascii(bytes, 29, 6) === 'vorbis'
        ? u32(bytes, 40, true)
        : undefined;
    }

    case 'mp3': {
      let offset = 0;
      if (ascii(bytes, 0, 3) === 'ID3') {
        offset =
          10 +
          (((bytes[6] ?? 0) << 21) |
            ((bytes[7] ?? 0) << 14) |
            ((bytes[8] ?? 0) << 7) |
            (bytes[9] ?? 0));
      }

      for (; offset + 3 <= bytes.length; offset++) {
        if (
          bytes[offset] !== 0xff ||
          ((bytes[offset + 1] ?? 0) & 0xe0) !== 0xe0
        ) {
          continue;
        }

        const version = ((bytes[offset + 1] ?? 0) >> 3) & 0x03;
        const layer = ((bytes[offset + 1] ?? 0) >> 1) & 0x03;
        const index = ((bytes[offset + 2] ?? 0) >> 2) & 0x03;
        const base = [44100, 48000, 32000][index];
        // Layer 0 is reserved in MPEG audio but used by ADTS AAC headers.
        if (version === 1 || layer === 0 || base === undefined) {
          continue;
        }

        // MPEG-1 keeps the base rate; MPEG-2 halves and MPEG-2.5 quarters it.
        return base / ({ 3: 1, 2: 2 }[version] ?? 4);
      }

      return undefined;
    }

    default:
      return undefined;
  }
}
