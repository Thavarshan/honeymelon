// Measure the built web converter in real engines and record a versioned
// capability/performance matrix. Build the web app first, then run:
//   node packages/e2e/scripts/benchmark-web.mjs
//     [--engines chromium,firefox,webkit] [--assert]
// Results go to docs/compatibility/web-benchmark.json. Timings are wall clock
// from Convert to Complete, including worker start, decode, encode and checks.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { crc32, deflateSync } from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwright = require('@playwright/test');
const root = new URL('../../../', import.meta.url);
const args = process.argv.slice(2);
const engines = (
  args[args.indexOf('--engines') + 1] && args.includes('--engines')
    ? args[args.indexOf('--engines') + 1]
    : 'chromium,firefox,webkit'
).split(',');
const url = 'http://127.0.0.1:4174/';

/**
 * Release-blocking smoke thresholds for a standard GitHub-hosted runner or a
 * 2020-or-newer laptop. Deliberately generous: they catch regressions such as
 * main-thread encoding or repeated decodes, not normal machine variance.
 */
export const thresholds = {
  startupMs: 5000,
  'image-12mp-jpg': 8000,
  'image-12mp-png': 15000,
  'audio-60s-wav': 6000,
  'video-frame-png': 6000,
};

function png(width, height) {
  // Deterministic gradient so encoders do real work.
  const row = Buffer.alloc(1 + width * 4);
  const rows = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.from(row);
    for (let x = 0; x < width; x++) {
      line.set(
        [(x * 7) & 255, (y * 3) & 255, ((x + y) * 5) & 255, 255],
        1 + x * 4,
      );
    }

    rows.push(line);
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
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
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 1 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function wav(seconds, sampleRate = 44100) {
  const frames = seconds * sampleRate;
  const buffer = Buffer.alloc(44 + frames * 4);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + frames * 4, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i++) {
    const sample = Math.round(
      Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 12000,
    );
    buffer.writeInt16LE(sample, 44 + i * 4);
    buffer.writeInt16LE(sample, 46 + i * 4);
  }

  return buffer;
}

let scratch = '';

/** Inputs go through files: Playwright caps in-memory uploads at 50 MB. */
async function input(name, buffer) {
  const file = path.join(scratch, name);
  await writeFile(file, buffer);

  return file;
}

async function choose(page, region, format) {
  await region.getByRole('combobox', { name: 'Output format' }).click();
  const option = page.getByRole('option', {
    name: new RegExp(`^${format}`, 'i'),
  });
  const available = !(await option.getByText('Encoder unavailable').count());
  if (available) {
    await option.click();
  } else {
    await page.keyboard.press('Escape');
  }

  return available;
}

async function timed(page, region, files) {
  await region
    .getByRole('button', { name: 'Clear' })
    .click()
    .catch(() => {});
  await region.locator('input[type=file]').setInputFiles(files);
  const start = Date.now();
  await region.getByRole('button', { name: 'Convert', exact: true }).click();
  await region
    .locator('.state-queued, .state-running, .state-canceling')
    .first()
    .waitFor({ state: 'detached', timeout: 120000 });
  const elapsed = Date.now() - start;
  const failed = await region.locator('.state-failed').count();

  return failed
    ? {
        ms: elapsed,
        status: 'failed',
        error: await region
          .locator('.job-error p')
          .first()
          .textContent()
          .catch(() => null),
      }
    : { ms: elapsed, status: 'ok' };
}

async function capabilities(page, region, formats) {
  const result = {};
  await region.getByRole('combobox', { name: 'Output format' }).click();
  for (const format of formats) {
    const option = page.getByRole('option', {
      name: new RegExp(`^${format}`, 'i'),
    });
    result[format] =
      (await option.count()) &&
      !(await option.getByText('Encoder unavailable').count());
  }

  await page.keyboard.press('Escape');

  return result;
}

async function measure(name) {
  const browser = await playwright[name].launch();
  const page = await browser.newPage();
  const record = { engine: name, version: browser.version(), results: {} };
  try {
    const started = Date.now();
    await page.goto(url);
    await page.getByRole('tab', { name: 'Image' }).waitFor();
    await page
      .getByRole('combobox', { name: 'Output format' })
      .first()
      .waitFor();
    record.results.startupMs = { ms: Date.now() - started, status: 'ok' };
    record.deviceMemory = await page.evaluate(
      () => navigator.deviceMemory ?? null,
    );
    record.crossOriginIsolated = await page.evaluate(() => crossOriginIsolated);
    record.offscreenCanvas = await page.evaluate(
      () => typeof OffscreenCanvas !== 'undefined',
    );
    record.webAssembly = await page.evaluate(
      () => typeof WebAssembly === 'object',
    );
    record.sharedArrayBuffer = await page.evaluate(
      () => typeof SharedArrayBuffer !== 'undefined',
    );

    const image = page.getByRole('region', { name: 'Image', exact: true });
    record.capabilities = {
      image: await capabilities(page, image, [
        'jpg',
        'png',
        'webp',
        'avif',
        'gif',
        'bmp',
        'tiff',
      ]),
    };
    for (const [label, width, height] of [
      ['1mp', 1000, 1000],
      ['12mp', 4000, 3000],
      ['24mp', 6000, 4000],
      ['48mp', 8000, 6000],
    ]) {
      const file = await input(`bench-${label}.png`, png(width, height));
      for (const format of ['jpg', 'png', 'webp', 'avif']) {
        if (!(await choose(page, image, format))) {
          record.results[`image-${label}-${format}`] = {
            status: 'unavailable',
          };
          continue;
        }

        record.results[`image-${label}-${format}`] = await timed(
          page,
          image,
          file,
        );
      }
    }

    await page.getByRole('tab', { name: 'Audio' }).click();
    const audio = page.getByRole('region', { name: 'Audio', exact: true });
    record.capabilities.audio = await capabilities(page, audio, [
      'wav',
      'mp3',
      'flac',
      'opus',
    ]);
    for (const seconds of [60, 600]) {
      record.results[`audio-${seconds}s-wav`] = await timed(
        page,
        audio,
        await input(`bench-${seconds}s.wav`, wav(seconds)),
      );
    }

    for (const fixture of ['tone.mp3', 'tone.flac', 'tone.ogg']) {
      record.results[`audio-decode-${fixture}`] = await timed(
        page,
        audio,
        new URL(`../fixtures/media/${fixture}`, import.meta.url).pathname,
      );
    }

    await page.getByRole('tab', { name: 'Video' }).click();
    const video = page.getByRole('region', { name: 'Video', exact: true });
    const clip = new URL('../fixtures/media/clip.webm', import.meta.url)
      .pathname;
    record.results['video-audio-wav'] = await timed(page, video, clip);
    await video.getByRole('button', { name: 'Output settings' }).click();
    const dialog = page.getByRole('dialog', { name: 'Output settings' });
    await dialog.getByRole('combobox', { name: 'Task' }).click();
    await page.getByRole('option', { name: 'Save a frame' }).click();
    await dialog.getByRole('combobox', { name: 'Output format' }).click();
    await page.getByRole('option', { name: /^PNG/ }).click();
    await dialog.getByRole('button', { name: 'Dismiss' }).click();
    record.results['video-frame-png'] = await timed(page, video, clip);
  } catch (error) {
    record.error =
      error instanceof Error ? error.message.split('\n')[0] : String(error);
  } finally {
    await browser.close();
  }

  return record;
}

const server = spawn('npm', ['exec', '--', 'vite', 'preview'], {
  cwd: new URL('apps/web/', root),
  detached: true,
  stdio: 'ignore',
});
scratch = await mkdtemp(path.join(os.tmpdir(), 'honeymelon-bench-'));
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (
      await fetch(url).then(
        (response) => response.ok,
        () => false,
      )
    ) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const runs = [];
  for (const engine of engines) {
    console.log(`Measuring ${engine}…`);
    runs.push(await measure(engine));
  }

  const report = {
    measuredAt: new Date().toISOString(),
    webVersion: JSON.parse(
      await readFile(new URL('apps/web/package.json', root), 'utf8'),
    ).version,
    playwright: require('@playwright/test/package.json').version,
    host: {
      platform: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      cores: os.cpus().length,
      memoryGiB: Math.round(os.totalmem() / 2 ** 30),
    },
    thresholds,
    runs,
  };
  await writeFile(
    new URL('docs/compatibility/web-benchmark.json', root),
    JSON.stringify(report, null, 2) + '\n',
  );
  const breaches = runs.flatMap((run) =>
    Object.entries(thresholds)
      .filter(
        ([key, limit]) =>
          run.results[key]?.status === 'ok' && run.results[key].ms > limit,
      )
      .map(
        ([key, limit]) =>
          `${run.engine} ${key}: ${run.results[key].ms} ms > ${limit} ms`,
      ),
  );
  for (const run of runs) {
    console.log(run.engine, run.version, run.error ?? '');
    console.table(
      Object.fromEntries(
        Object.entries(run.results).map(([key, value]) => [
          key,
          `${value.status} ${value.ms ?? ''}`,
        ]),
      ),
    );
  }

  if (breaches.length) {
    console.error(`Threshold breaches:\n${breaches.join('\n')}`);
    if (args.includes('--assert')) {
      process.exitCode = 1;
    }
  }
} finally {
  process.kill(-server.pid);
  await rm(scratch, { recursive: true, force: true });
}
