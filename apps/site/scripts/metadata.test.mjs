import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSiteOrigin,
  getWebAppUrl,
  pageMetadata,
  publicRoutes,
} from '../src/lib/metadata.ts';

test('canonical configuration accepts HTTPS origins and rejects URL pollution', () => {
  assert.equal(getSiteOrigin(''), undefined);
  assert.equal(
    getSiteOrigin('https://honeymelon.example').href,
    'https://honeymelon.example/',
  );
  for (const value of [
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'http://honeymelon.example',
    'not a URL',
    'https://honeymelon.example/path',
    'https://user:password@honeymelon.example',
    'https://honeymelon.example/?tracking=1',
    'https://honeymelon.example/#fragment',
  ]) {
    assert.throws(() => getSiteOrigin(value), value);
  }
});

test('every real route has its own canonical and matching social metadata', () => {
  const previous = process.env.HONEYMELON_SITE_URL;
  try {
    process.env.HONEYMELON_SITE_URL = 'https://honeymelon.example';
    for (const route of publicRoutes) {
      const metadata = pageMetadata(
        route,
        'Example title',
        'Example description',
      );
      assert.equal(
        metadata.alternates.canonical,
        'https://honeymelon.example' + route,
      );
      assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
      assert.equal(metadata.openGraph.title, metadata.title);
      assert.equal(metadata.twitter.description, metadata.description);
      assert.equal(metadata.robots.index, true);
      assert.equal(
        metadata.openGraph.images[0].url,
        'https://honeymelon.example/og-honeymelon.png',
      );
    }

    delete process.env.HONEYMELON_SITE_URL;
    const preview = pageMetadata('/', 'Preview', 'Not a deployed site');
    assert.equal(preview.robots.index, false);
    assert.equal(preview.alternates, undefined);
    assert.deepEqual(preview.openGraph.images, []);
  } finally {
    if (previous === undefined) {
      delete process.env.HONEYMELON_SITE_URL;
    } else {
      process.env.HONEYMELON_SITE_URL = previous;
    }
  }
});

test('the web app is linked only when a deployed HTTPS origin is configured', () => {
  assert.equal(getWebAppUrl(''), undefined);
  assert.equal(getWebAppUrl(undefined), undefined);
  assert.equal(
    getWebAppUrl('https://honeymelon-web.example.workers.dev').href,
    'https://honeymelon-web.example.workers.dev/',
  );
  for (const value of [
    'http://honeymelon-web.example',
    'https://honeymelon-web.example/app',
    'https://user@honeymelon-web.example',
    'https://honeymelon-web.example/?ref=site',
  ]) {
    assert.throws(() => getWebAppUrl(value), /HONEYMELON_WEB_URL/);
  }
});
