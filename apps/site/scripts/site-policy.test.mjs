import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

/**
 * Fetch a checked-in source file as text.
 *
 * new URL resolves relative to this test file, so this works from the
 * monorepo root as well as from the @honeymelon/site workspace.
 *
 * @param {string} name - Site-relative filename, for example app/page.tsx.
 * @returns {Promise<string>} Text from the requested file.
 */
async function source(name) {
  const text = await readFile(new URL('../' + name, import.meta.url), 'utf8');

  // JSX line wrapping must not change checks for human-readable policy text.
  return text.replace(/\s+/g, ' ');
}

test('Cloudflare serves static files without a Worker script', async () => {
  const wrangler = await source('wrangler.toml');

  assert.ok(wrangler.includes('directory = "./out"'));
  assert.ok(wrangler.includes('not_found_handling = "404-page"'));
  assert.doesNotMatch(wrangler, /^main\s*=/m);
});

test('HTTP security headers restrict powerful browser features', async () => {
  const headers = await source('public/_headers');

  assert.ok(headers.includes('X-Frame-Options: DENY'));
  assert.ok(headers.includes("frame-ancestors 'none'"));
  assert.ok(headers.includes('camera=()'));
  assert.ok(headers.includes("connect-src 'self'"));
});

test('marketing and download pages use the actual shared UI components', async () => {
  for (const name of ['app/page.tsx', 'src/components/download-library.tsx']) {
    const page = await source(name);

    assert.ok(page.includes("from '@honeymelon/ui/components/card'"));
    assert.ok(page.includes("from '@honeymelon/ui/components/badge'"));
  }

  for (const name of ['app/page.tsx', 'src/components/smart-download.tsx']) {
    assert.ok(
      (await source(name)).includes("from '@honeymelon/ui/components/button'"),
    );
  }

  const styles = await source('app/globals.css');
  assert.ok(styles.includes("@import '@honeymelon/ui/styles/globals.css'"));
});

test('motion has an accessible pause control and an OS-level opt out', async () => {
  const toggle = await source('src/components/motion-toggle.tsx');
  const styles = await source('app/globals.css');

  assert.ok(toggle.includes('aria-pressed={paused}'));
  assert.ok(toggle.includes('document.documentElement.dataset.motionPaused'));
  assert.ok(styles.includes("html[data-motion-paused='true']"));
  assert.ok(styles.includes('(prefers-reduced-motion: reduce)'));
});

test('copy never advertises a working online converter', async () => {
  const landing = await source('app/page.tsx');
  const downloads = await source('app/download/page.tsx');

  assert.ok(landing.includes('it is not available yet'));
  assert.ok(downloads.includes('There is no live browser converter yet'));
  assert.ok(downloads.includes('SHA256SUMS'));
});

test('the static marketing workspace cannot import the native engine', async () => {
  const pages = await Promise.all(
    ['app/layout.tsx', 'app/page.tsx', 'app/download/page.tsx'].map(source),
  );

  for (const page of pages) {
    assert.ok(!page.includes("from '@honeymelon/engine'"));
    assert.ok(!page.includes("from 'electron'"));
  }
});

test('public guidance discloses browser limitations and hosting logs', async () => {
  const docs = await source('app/docs/page.tsx');
  const privacy = await source('app/privacy/page.tsx');
  const layout = await source('app/layout.tsx');

  assert.ok(docs.includes('not available'));
  assert.ok(privacy.includes('Hosting providers may process'));
  assert.ok(privacy.includes('unsigned'));
  assert.ok(layout.includes('href="/docs/"'));
  assert.ok(layout.includes('href="/privacy/"'));
});

test('feature descriptions remain explicit about web availability', async () => {
  const features = await source('app/features/page.tsx');
  const layout = await source('app/layout.tsx');

  assert.ok(features.includes('no live browser converter yet'));
  assert.ok(layout.includes('href="/features/"'));
  const metadata = await source('src/lib/metadata.ts');
  assert.ok(metadata.includes('og-honeymelon.png'));
});
