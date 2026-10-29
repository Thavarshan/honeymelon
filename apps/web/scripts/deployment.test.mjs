import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { verifyDeployment } from './verify-deployment.mjs';
import { verifyDist } from './verify-dist.mjs';

const csp =
  "default-src 'self'; script-src 'self'; connect-src 'self'; worker-src 'self'; form-action 'none'; frame-ancestors 'none'";

/** Simulate the static host, optionally with one defect. */
function host(target, broken = '') {
  return async (url, options = {}) => {
    const { pathname } = new URL(url);
    const headers = new Headers({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'cross-origin-opener-policy': 'same-origin',
      'referrer-policy': 'no-referrer',
      'content-security-policy':
        broken === 'eval' ? csp + " 'unsafe-eval'" : csp,
    });
    if (target === 'preview' && broken !== 'indexing') {
      headers.set('x-robots-tag', 'noindex, nofollow');
    }

    if (options.method && options.method !== 'GET') {
      return new Response('', { status: broken === 'upload' ? 200 : 405 });
    }

    if (pathname === '/sw.js') {
      headers.set('content-type', 'text/javascript');
      headers.set('cache-control', 'no-cache');

      return new Response('const VERSION = "0123456789abcdef";', { headers });
    }

    if (pathname === '/manifest.webmanifest') {
      return Response.json({ name: 'Honeymelon Web' });
    }

    if (pathname === '/deployment.json') {
      return Response.json({ environment: target, revision: 'a'.repeat(40) });
    }

    if (pathname.startsWith('/assets/')) {
      headers.set('cache-control', 'public, max-age=31536000, immutable');

      return new Response('x', { headers });
    }

    headers.set('content-type', 'text/html');

    return new Response(
      '<div id="root"></div><script src="/assets/index-abc.js"></script>',
      { headers },
    );
  };
}

test('accepts a correctly configured preview and production host', async () => {
  for (const target of ['preview', 'production']) {
    await verifyDeployment(
      'https://web.example.dev',
      target,
      'a'.repeat(40),
      host(target),
    );
  }
});

test('rejects weakened security, indexing, uploads and wrong revisions', async () => {
  for (const [target, broken, message] of [
    ['production', 'eval', /unsafe-eval/],
    ['preview', 'indexing', /noindex/],
    ['production', 'upload', /POST \/ must not succeed/],
  ]) {
    await assert.rejects(
      verifyDeployment(
        'https://web.example.dev',
        target,
        '',
        host(target, broken),
      ),
      message,
    );
  }

  await assert.rejects(
    verifyDeployment(
      'https://web.example.dev',
      'production',
      'b'.repeat(40),
      host('production'),
    ),
    /wrong revision/,
  );
  await assert.rejects(
    verifyDeployment(
      'http://web.example.dev',
      'production',
      '',
      host('production'),
    ),
    /Only local verification/,
  );
});

test('dist verification enforces precache, size and network-API rules', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'honeymelon-dist-'));
  try {
    await mkdir(path.join(root, 'assets'));
    await writeFile(path.join(root, 'index.html'), '<div id="root"></div>');
    await writeFile(path.join(root, 'assets/app.js'), 'console.log(1)');
    await writeFile(
      path.join(root, 'sw.js'),
      'const VERSION = "x";\nconst PRECACHE = ["/","/assets/app.js"];',
    );
    assert.deepEqual((await verifyDist(root)).problems, []);

    await writeFile(
      path.join(root, 'assets/leak.js'),
      'navigator.sendBeacon(u)',
    );
    await writeFile(path.join(root, 'assets/app.js.map'), '{}');
    const { problems } = await verifyDist(root);
    assert.ok(problems.some((item) => item.includes('forbidden network')));
    assert.ok(problems.some((item) => item.includes('source maps')));
    assert.ok(
      problems.some((item) => item.includes('leak.js is not precached')),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
