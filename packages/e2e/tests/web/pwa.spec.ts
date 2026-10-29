import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { fixture, guardNetwork, panel, settle } from '../../src/web.js';

test.use({ serviceWorkers: 'allow' });

test('installs, starts offline, converts offline and caches no media', async ({
  page,
  context,
  baseURL,
  browserName,
}) => {
  const violations = await guardNetwork(page, baseURL!);
  await page.goto('/');
  await expect(page.getByText('Works offline')).toBeVisible({ timeout: 20000 });
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel=manifest]');

    return link ? (await fetch(link.href)).json() : null;
  });
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/' });
  test.skip(
    browserName === 'firefox',
    "Playwright's Firefox offline emulation fails navigation before the service worker answers; verify Firefox offline start manually",
  );

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Image' })).toBeVisible();
  await panel(page, 'Image')
    .locator('input[type=file]')
    .setInputFiles(fixture('images/rgb.png'));
  await panel(page, 'Image')
    .getByRole('button', { name: 'Convert', exact: true })
    .click();
  await settle(page, 'Image');
  await expect(panel(page, 'Image').getByText('Complete')).toBeVisible();

  // Cache Storage holds exactly the versioned app shell: no media, no blobs.
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        urls.push(`${key} ${new URL(request.url).pathname}`);
      }
    }

    return urls;
  });
  expect(cached.length).toBeGreaterThan(5);
  for (const entry of cached) {
    expect(entry).toMatch(
      /^honeymelon-web-[a-f0-9]{16} \/(?:|assets\/.+|icons\/.+|logo\.svg|manifest\.webmanifest)$/,
    );
    expect(entry).not.toContain('rgb');
  }

  await context.setOffline(false);
  expect(violations).toEqual([]);
});

test('offers an update, applies it only on request and drops the old cache', async ({
  page,
}) => {
  // Serve a private copy so the test can "deploy" a new version mid-session.
  const root = await mkdtemp(path.join(tmpdir(), 'honeymelon-web-'));
  await cp(
    path.resolve(import.meta.dirname, '../../../../apps/web/dist'),
    root,
    {
      recursive: true,
    },
  );
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://local').pathname;
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    readFile(file).then(
      (body) => {
        response.writeHead(200, {
          'content-type':
            types[path.extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-cache',
        });
        response.end(body);
      },
      () => {
        response.writeHead(404);
        response.end();
      },
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await page.goto(origin);
    await expect(page.getByText('Works offline')).toBeVisible({
      timeout: 20000,
    });
    const [before] = await page.evaluate(() => caches.keys());
    const worker = path.join(root, 'sw.js');
    await writeFile(
      worker,
      (await readFile(worker, 'utf8')).replace(
        /const VERSION = "([a-f0-9]{16})"/,
        (_match, version: string) =>
          `const VERSION = "${[...version].reverse().join('')}"`,
      ),
    );
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    await expect(page.getByText('A new version is ready')).toBeVisible({
      timeout: 20000,
    });
    // Nothing is activated or deleted until the user decides.
    expect(await page.evaluate(() => caches.keys())).toContain(before);
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Reload' }).click();
    await reloaded;
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .not.toContain(before);
    await expect(page.getByRole('tab', { name: 'Image' })).toBeVisible();
  } finally {
    server.close();
    await rm(root, { recursive: true, force: true });
  }
});
