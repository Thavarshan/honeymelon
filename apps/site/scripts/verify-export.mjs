import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { validateManifest } from '../src/lib/releases.ts';

/**
 * Fail a production build if its static pages or security files are missing.
 *
 * Next.js exports HTML and assets to out/. Cloudflare can serve these files
 * directly, without executing an application server for each visitor.
 * This check deliberately opens the generated output instead of relying only
 * on TypeScript compiling the original React source.
 */
const output = path.resolve('out');
const required = [
  'index.html',
  'download/index.html',
  'docs/index.html',
  'features/index.html',
  'privacy/index.html',
  'releases/index.html',
  'license/index.html',
  'sitemap.xml',
  '404.html',
  'robots.txt',
  '_headers',
  '_redirects',
  'logo.svg',
  'og-honeymelon.png',
  'screenshots/desktop-light.webp',
  'screenshots/output-settings.webp',
  'screenshots/desktop-dark.webp',
];

for (const name of required) {
  const asset = path.join(output, name);
  assert((await stat(asset)).isFile(), 'Missing static asset: ' + name);
}

const landing = await readFile(path.join(output, 'index.html'), 'utf8');
const download = await readFile(
  path.join(output, 'download/index.html'),
  'utf8',
);
const notFound = await readFile(path.join(output, '404.html'), 'utf8');
const headers = await readFile(path.join(output, '_headers'), 'utf8');

// Check rendered exact destinations against the same validated build snapshot.
assert.ok(landing.includes('href="/download/"'));
assert.ok(landing.includes('Made simple.'));
assert.ok(landing.includes('Pause motion'));
const manifest = validateManifest(
  JSON.parse(
    await readFile(
      new URL('../src/data/releases.json', import.meta.url),
      'utf8',
    ),
  ),
);
assert.ok(
  download.includes('href="https://github.com/Thavarshan/honeymelon/releases"'),
);
for (const release of manifest.releases) {
  assert.ok(download.includes(`href="${release.url}"`));
  for (const asset of release.assets) {
    assert.ok(download.includes(`href="${asset.url}"`));
  }
}

// Parse resource/link destinations and compare the exact hostname.
for (const match of download.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const destination = new URL(match[1], 'https://static.invalid');
  assert.notEqual(
    destination.hostname,
    'api.github.com',
    'The static download page must not reference the GitHub API',
  );
}

assert.ok(notFound.includes('Wrong orbit.'));
assert.ok(landing.includes('href="/download/"'));
const docs = await readFile(path.join(output, 'docs/index.html'), 'utf8');
const privacy = await readFile(path.join(output, 'privacy/index.html'), 'utf8');
const features = await readFile(
  path.join(output, 'features/index.html'),
  'utf8',
);
assert.ok(docs.includes('Getting started with Honeymelon'));
assert.ok(privacy.includes('Privacy and limitations'));
assert.ok(features.includes('Desktop or browser?'));
assert.ok(features.includes('no live browser converter yet'));
// Social images are emitted only when a canonical deployment is configured.
const origin = process.env.HONEYMELON_SITE_URL;
const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
if (origin) {
  assert.ok(landing.includes('og-honeymelon.png'));
  assert.ok(sitemap.includes(new URL('/features/', origin).href));
  assert.ok(robots.includes(new URL('/sitemap.xml', origin).href));
} else {
  assert.ok(landing.includes('noindex'));
  assert.ok(robots.includes('Disallow: /'));
  assert.ok(!sitemap.includes('<loc>'));
}

assert.ok(docs.includes('not available'));
assert.ok(
  privacy.includes('hosting providers') ||
    privacy.includes('Hosting providers'),
);
assert.ok(headers.includes('Content-Security-Policy:'));
assert.ok(headers.includes("frame-ancestors 'none'"));
assert.ok(!landing.includes('/_next/image?'), 'No runtime image optimizer');

console.log('Honeymelon site static pages and release links verified');

// Fail before deployment if a screenshot or social asset becomes excessive.
for (const asset of [
  'og-honeymelon.png',
  'screenshots/desktop-light.webp',
  'screenshots/output-settings.webp',
  'screenshots/desktop-dark.webp',
]) {
  assert.ok(
    (await stat(path.join(output, asset))).size < 150_000,
    asset + ' exceeds the 150 kB asset budget',
  );
}

// Budget all exported JavaScript, including framework and route chunks.
let javascriptBytes = 0;
for (const asset of await readdir(path.join(output, '_next'), {
  recursive: true,
})) {
  if (asset.endsWith('.js')) {
    const bytes = await readFile(path.join(output, '_next', asset));
    javascriptBytes += brotliCompressSync(bytes).length;
  }
}

assert.ok(
  javascriptBytes < 250_000,
  'Exported JavaScript exceeds 250 kB Brotli',
);
console.log('Exported JavaScript Brotli bytes:', javascriptBytes);
