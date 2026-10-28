import { crc32, deflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  expect,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';

/**
 * Abort and record any request that leaves the app origin or carries a body.
 * Selected media is never fetched, so any such request is a privacy failure.
 */
export async function guardNetwork(
  page: Page,
  baseURL: string,
): Promise<string[]> {
  const violations: string[] = [];
  const origin = new URL(baseURL).origin;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      url.origin !== origin ||
      !['GET', 'HEAD'].includes(request.method()) ||
      request.postDataBuffer()
    ) {
      violations.push(`${request.method()} ${url.href}`);
      await route.abort();
    } else {
      await route.continue();
    }
  });

  return violations;
}

/** The visible converter panel for a media type. */
export const panel = (
  page: Page,
  media: 'Image' | 'Audio' | 'Video',
): Locator => page.getByRole('region', { name: media, exact: true });

/** Fixture path relative to the e2e workspace. */
export const fixture = (...parts: string[]): string =>
  path.resolve(import.meta.dirname, '../fixtures', ...parts);

/** Read a completed download fully into memory. */
export async function downloadBytes(download: Download): Promise<Buffer> {
  const file = await download.path();

  return readFile(file);
}

/** Decode bytes with the page's own image decoder and return dimensions. */
export async function decodedSize(
  page: Page,
  bytes: Buffer,
): Promise<{ width: number; height: number }> {
  return page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();

      return size;
    },
    [...bytes],
  );
}

/** Wait until every row in a panel reaches a terminal state. */
export async function settle(
  page: Page,
  media: 'Image' | 'Audio' | 'Video',
): Promise<void> {
  await expect(
    panel(page, media).locator(
      '.state-queued, .state-running, .state-canceling',
    ),
  ).toHaveCount(0, { timeout: 45000 });
}

/** A solid opaque RGBA PNG of any size, built without image libraries. */
export function solidPng(width: number, height: number): Buffer {
  const row = Buffer.alloc(1 + width * 4, 0xff);
  row[0] = 0;
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));

    return Buffer.concat([length, body, crc]);
  };

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Parse a PCM WAV header written by Honeymelon Web. */
export function wavHeader(bytes: Buffer): {
  channels: number;
  sampleRate: number;
  bitDepth: number;
  seconds: number;
} {
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.subarray(8, 12).toString('ascii')).toBe('WAVE');
  const channels = bytes.readUInt16LE(22);
  const bitDepth = bytes.readUInt16LE(34);

  return {
    channels,
    sampleRate: bytes.readUInt32LE(24),
    bitDepth,
    seconds:
      bytes.readUInt32LE(40) /
      (channels * (bitDepth / 8)) /
      bytes.readUInt32LE(24),
  };
}
