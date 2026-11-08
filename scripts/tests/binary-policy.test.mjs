import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import manifest from '../binary-manifest.json' with { type: 'json' };
import {
  downloadUrl,
  validateDigest,
  verifyDownload,
  fetchBinary,
} from '../lib/binary-policy.mjs';

const url = manifest.targets['linux-x64'].files[0].url;
const payload = Buffer.from('verified native resource');
const sha256 = createHash('sha256').update(payload).digest('hex');

test('all committed sources are allowed, but arbitrary endpoints are rejected', () => {
  for (const target of Object.values(manifest.targets)) {
    for (const file of target.files) {
      assert.equal(downloadUrl(file.url), file.url);
      assert.equal(validateDigest(file.sha256), file.sha256);
    }
  }

  for (const value of [
    'http://github.com/BtbN/FFmpeg-Builds/releases/download/bad/file',
    'https://github.com.evil.example/BtbN/FFmpeg-Builds/releases/download/a/b',
    'https://github.com/private/repository',
    'https://127.0.0.1/secret',
    'https://user:password@github.com/BtbN/FFmpeg-Builds/releases/download/a/b',
    url + '?local-file-contents=secret',
  ]) {
    assert.throws(() => downloadUrl(value));
  }

  assert.throws(() => validateDigest('../cache-path'));
  assert.throws(() => verifyDownload(payload, '0'.repeat(64)), /mismatch/);
});

test('allows the renamed FFmpeg release while keeping repository paths exact', () => {
  const canonical = manifest.targets['linux-x64'].files[0].url;
  const old = canonical.replace(
    'FFmpeg-Builds/FFmpeg-Builds',
    'BtbN/FFmpeg-Builds',
  );
  const unrelated = canonical.replace(
    'FFmpeg-Builds/FFmpeg-Builds',
    'untrusted/FFmpeg-Builds',
  );

  assert.equal(downloadUrl(canonical), canonical);
  assert.equal(downloadUrl(old), old);
  assert.throws(() => downloadUrl(unrelated), /not allowlisted/);
});

test('follows the FFmpeg repository rename and still pins redirected bytes', async () => {
  const canonical = manifest.targets['linux-x64'].files[0].url;
  const old = canonical.replace(
    'FFmpeg-Builds/FFmpeg-Builds',
    'BtbN/FFmpeg-Builds',
  );
  let requests = 0;

  const result = await fetchBinary({ url: old, sha256 }, async (url) => {
    requests += 1;
    if (requests === 1) {
      assert.equal(url, old);

      return new Response(null, {
        status: 301,
        headers: { location: canonical },
      });
    }

    if (requests === 2) {
      assert.equal(url, canonical);

      return new Response(null, {
        status: 302,
        headers: {
          location:
            'https://release-assets.githubusercontent.com/github-production-release-asset/asset',
        },
      });
    }

    return new Response(payload);
  });

  assert.deepEqual(result, payload);
  assert.equal(requests, 3);
});

test('redirect targets are rejected before a second network request', async () => {
  let requests = 0;
  await assert.rejects(
    fetchBinary({ url, sha256 }, async () => {
      requests += 1;

      return new Response(null, {
        status: 302,
        headers: { location: 'https://127.0.0.1/private' },
      });
    }),
    /not allowlisted/,
  );
  assert.equal(requests, 1);
});

test('downloaded bytes cannot leave quarantine with a mismatched digest', async () => {
  await assert.rejects(
    fetchBinary({ url, sha256 }, async () => new Response('tampered binary')),
    /SHA-256 mismatch/,
  );
  const result = await fetchBinary(
    { url, sha256 },
    async () => new Response(payload),
  );
  assert.deepEqual(result, payload);
});

test('redirect loops and oversized responses are rejected', async () => {
  await assert.rejects(
    fetchBinary(
      { url, sha256 },
      async () =>
        new Response(null, { status: 302, headers: { location: url } }),
    ),
    /Too many binary download redirects/,
  );
  await assert.rejects(
    fetchBinary({ url, sha256 }, async () => ({
      ok: true,
      body: {
        async *[Symbol.asyncIterator]() {
          yield { byteLength: 512 * 1024 * 1024 + 1 };
        },
      },
    })),
    /exceeds the size limit/,
  );
});
