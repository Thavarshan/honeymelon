import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unzipSync } from 'fflate';
import {
  decodedSize,
  downloadBytes,
  fixture,
  guardNetwork,
  panel,
  settle,
  solidPng,
  wavHeader,
} from '../../src/web.js';

let violations: string[] = [];
const errors: string[] = [];

test.beforeEach(async ({ page, baseURL }) => {
  violations = await guardNetwork(page, baseURL!);
  errors.length = 0;
  page.on('pageerror', (error) => errors.push(error.message));
});

test.afterEach(() => {
  // No request may leave the origin or carry a body, in any test.
  expect(violations).toEqual([]);
  expect(errors).toEqual([]);
});

async function convert(page: Page, media: 'Image' | 'Audio' | 'Video') {
  await panel(page, media)
    .getByRole('button', { name: 'Convert', exact: true })
    .click();
  await settle(page, media);
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: `Download: ${name}` }).click();

  return event;
}

async function detail(page: Page, name: string): Promise<string> {
  const row = page.locator('.file-row', { hasText: name });
  await row.getByRole('button', { name: 'Technical details' }).click();

  return (await row.locator('.job-error p').textContent()) ?? '';
}

test('boots without accounts, native bridge or uploads, and passes axe @mobile', async ({
  page,
}) => {
  await page.goto('/');
  for (const name of ['Image', 'Audio', 'Video']) {
    await expect(page.getByRole('tab', { name })).toBeVisible();
  }

  await expect(page.getByText('never uploaded')).toBeVisible();
  expect(await page.evaluate(() => 'honeymelon' in window)).toBe(false);
  for (const dark of [false, true]) {
    await page.evaluate(
      (value) => document.documentElement.classList.toggle('dark', value),
      dark,
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations
        .filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))
        .map(
          (item) =>
            `${item.id}: ${item.nodes.map((node) => node.target).join(', ')}`,
        ),
    ).toEqual([]);
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test('converts PNG to a validated JPEG download without touching the source @mobile', async ({
  page,
}) => {
  await page.goto('/');
  const source = fixture('images/rgb.png');
  await panel(page, 'Image').locator('input[type=file]').setInputFiles(source);
  await expect(page.getByText('rgb.png', { exact: true })).toBeVisible();
  await convert(page, 'Image');
  await expect(panel(page, 'Image').getByText('Complete')).toBeVisible();
  const file = await download(page, 'rgb.png');
  expect(file.suggestedFilename()).toBe('rgb.jpg');
  const bytes = await downloadBytes(file);
  expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect(await decodedSize(page, bytes)).toEqual(
    await decodedSize(page, await readFile(source)),
  );
});

test('batches images to WebP where the encoder is verified and exports a ZIP', async ({
  page,
}) => {
  await page.goto('/');
  const image = panel(page, 'Image');
  await image.getByRole('combobox', { name: 'Output format' }).click();
  const webp = page.getByRole('option', { name: /^WEBP/ });
  if (await webp.getByText('Encoder unavailable').count()) {
    // WebKit's canvas falls back to PNG for WebP; it must not be offered.
    await expect(webp).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    test.skip(true, 'No verified WebP encoder in this engine');
  }

  await webp.click();
  await image
    .locator('input[type=file]')
    .setInputFiles([fixture('images/rgb.png'), fixture('images/rgb.jpg')]);
  await convert(page, 'Image');
  await expect(image.getByText('Complete')).toHaveCount(2);
  const archive = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all' }).click();
  const entries = unzipSync(new Uint8Array(await downloadBytes(await archive)));
  expect(Object.keys(entries).sort()).toEqual([
    'README.txt',
    'rgb (2).webp',
    'rgb.webp',
  ]);
  for (const name of ['rgb.webp', 'rgb (2).webp']) {
    expect(Buffer.from(entries[name]!.subarray(8, 12)).toString()).toBe('WEBP');
  }
});

test('explains unsupported, renamed, animated and oversized inputs', async ({
  page,
}) => {
  await page.goto('/');
  const image = panel(page, 'Image');
  await image.locator('input[type=file]').setInputFiles([
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') },
    { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not png') },
    { name: 'huge.png', mimeType: 'image/png', buffer: solidPng(8000, 8000) },
  ]);
  await expect(
    image.getByText('Unsupported files were skipped: notes.txt'),
  ).toBeVisible();
  await convert(page, 'Image');
  expect(await detail(page, 'fake.png')).toContain(
    'does not contain the media its extension describes',
  );
  expect(await detail(page, 'huge.png')).toMatch(
    /64 MP image exceeds the \d+ MP browser limit on this device/,
  );
});

test('cancels a running batch, keeps no partial output, then retries', async ({
  page,
}) => {
  await page.goto('/');
  const image = panel(page, 'Image');
  await image.locator('input[type=file]').setInputFiles([
    { name: 'large.png', mimeType: 'image/png', buffer: solidPng(6000, 6000) },
    {
      name: 'rgb.png',
      mimeType: 'image/png',
      buffer: await readFile(fixture('images/rgb.png')),
    },
  ]);
  await image.getByRole('button', { name: 'Convert', exact: true }).click();
  await image.getByRole('button', { name: /Cancel batch/ }).click();
  await settle(page, 'Image');
  await expect(image.locator('.state-canceled')).not.toHaveCount(0);
  await expect(
    image.getByRole('button', { name: /^Download: .*/ }),
  ).toHaveCount(await image.locator('.state-succeeded').count());
  await image.getByRole('button', { name: 'Retry unfinished' }).click();
  await settle(page, 'Image');
  await expect(image.locator('.state-succeeded')).toHaveCount(2);
});

test('writes WAV from compressed audio with stored output settings', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'honeymelon-web:preferences:v1',
      JSON.stringify({
        media: {
          audio: {
            format: 'wav',
            spec: {
              kind: 'audio',
              codec: 'default',
              sampleRate: 22050,
              channels: 1,
              bitDepth: 24,
              track: 0,
            },
          },
        },
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Audio' }).click();
  const audio = panel(page, 'Audio');
  await audio
    .locator('input[type=file]')
    .setInputFiles([fixture('media/tone.mp3'), fixture('media/tone.flac')]);
  await convert(page, 'Audio');
  for (const name of ['tone.mp3', 'tone.flac']) {
    const file = await download(page, name);
    const header = wavHeader(await downloadBytes(file));
    expect(header).toMatchObject({
      channels: 1,
      sampleRate: 22050,
      bitDepth: 24,
    });
    expect(header.seconds).toBeGreaterThan(0.95);
    expect(header.seconds).toBeLessThan(1.1);
  }
});

test('extracts audio from WebM, captures a frame, and offers no video encoder', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Video' }).click();
  const video = panel(page, 'Video');
  await video
    .locator('input[type=file]')
    .setInputFiles([
      fixture('media/clip.webm'),
      fixture('media/silent-video.webm'),
    ]);
  await convert(page, 'Video');
  const header = wavHeader(
    await downloadBytes(await download(page, 'clip.webm')),
  );
  expect(header).toMatchObject({
    channels: 2,
    sampleRate: 48000,
    bitDepth: 16,
  });
  expect(header.seconds).toBeGreaterThan(1.9);
  expect(await detail(page, 'silent-video.webm')).toContain('audio');

  await video.getByRole('button', { name: 'Clear' }).click();
  await video.getByRole('button', { name: 'Output settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Output settings' });
  await dialog.getByRole('combobox', { name: 'Task' }).click();
  await page.getByRole('option', { name: 'Convert video' }).click();
  await dialog.getByRole('combobox', { name: 'Output format' }).click();
  await expect(page.getByRole('option', { name: /^MP4/ })).toContainText(
    'Encoder unavailable',
  );
  await page.keyboard.press('Escape');
  await dialog.getByRole('combobox', { name: 'Task' }).click();
  await page.getByRole('option', { name: 'Save a frame' }).click();
  await dialog.getByRole('combobox', { name: 'Output format' }).click();
  await page.getByRole('option', { name: /^PNG/ }).click();
  await dialog.getByRole('button', { name: 'Dismiss' }).click();
  await expect(dialog).toBeHidden();
  await video
    .locator('input[type=file]')
    .setInputFiles(fixture('media/clip.webm'));
  await convert(page, 'Video');
  const frame = await download(page, 'clip.webm');
  expect(frame.suggestedFilename()).toBe('clip.png');
  expect(await decodedSize(page, await downloadBytes(frame))).toEqual({
    width: 320,
    height: 240,
  });
});

test('completes the image workflow with the keyboard alone', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Image' }).focus();
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('ControlOrMeta+o');
  await (await chooser).setFiles(fixture('images/rgb.jpg'));
  const convertButton = panel(page, 'Image').getByRole('button', {
    name: 'Convert',
    exact: true,
  });
  for (let press = 0; press < 40; press++) {
    if (
      await convertButton.evaluate(
        (element) => element === document.activeElement,
      )
    ) {
      break;
    }

    await page.keyboard.press('Tab');
  }

  await expect(convertButton).toBeFocused();
  await page.keyboard.press('Enter');
  await settle(page, 'Image');
  await expect(panel(page, 'Image').getByText('Complete')).toBeVisible();
});
