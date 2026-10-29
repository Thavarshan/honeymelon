import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

/**
 * Verify the live static app: security and isolation headers, SPA routing,
 * service worker freshness, immutable assets, revision marker and the absence
 * of any endpoint that accepts uploaded bytes.
 */
export async function verifyDeployment(
  origin,
  target,
  revision,
  fetcher = fetch,
) {
  const base = new URL(origin);
  assert.ok(['preview', 'production'].includes(target));
  assert.ok(
    base.protocol === 'https:' ||
      (base.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(base.hostname)),
    'Only local verification may use HTTP',
  );
  const request = (pathname, options = {}) =>
    fetcher(new URL(pathname, base), {
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      ...options,
    });

  let shell = '';
  for (const route of ['/', '/deep/link/']) {
    const response = await request(route);
    assert.equal(response.status, 200, `Route failed: ${route}`);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(
      response.headers.get('cross-origin-opener-policy'),
      'same-origin',
    );
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    const policy = response.headers.get('content-security-policy') ?? '';
    for (const directive of [
      "script-src 'self'",
      "connect-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'none'",
    ]) {
      assert.ok(policy.includes(directive), `CSP lacks ${directive}`);
    }

    assert.doesNotMatch(policy, /unsafe-eval/);
    const robots = response.headers.get('x-robots-tag') ?? '';
    if (target === 'production') {
      assert.doesNotMatch(robots, /noindex/);
    } else {
      assert.match(robots, /noindex/);
    }

    shell = await response.text();
    assert.ok(shell.includes('<div id="root">'), `No app shell at ${route}`);
  }

  const worker = await request('/sw.js');
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('content-type') ?? '', /javascript/);
  assert.match(worker.headers.get('cache-control') ?? '', /no-cache/);
  assert.match(await worker.text(), /const VERSION = "[a-f0-9]{16}"/);
  const manifest = await request('/manifest.webmanifest');
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).name, 'Honeymelon Web');

  const script = /src="(\/assets\/[^"]+\.js)"/.exec(shell)?.[1];
  assert.ok(script, 'No fingerprinted script found');
  const asset = await request(script);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control') ?? '', /immutable/);
  await asset.arrayBuffer();

  // Static assets accept no request bodies: there is no upload endpoint.
  for (const method of ['POST', 'PUT']) {
    const response = await request('/', { method, body: 'probe' });
    assert.ok(response.status >= 400, `${method} / must not succeed`);
    await response.arrayBuffer();
  }

  const marker = await (await request('/deployment.json')).json();
  assert.equal(marker.environment, target);
  if (revision) {
    assert.equal(marker.revision, revision, 'Host serves the wrong revision');
  }

  console.log(
    `Verified web ${target} headers, routing, PWA files and no upload path`,
  );
}

/** Allow edge propagation, but require every live check to pass together. */
export async function verifyPublishedDeployment(
  origin,
  target,
  revision,
  { fetcher = fetch, wait = setTimeout } = {},
) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await verifyDeployment(origin, target, revision, fetcher);

      return;
    } catch (error) {
      if (attempt === 6) {
        throw error;
      }

      console.warn(
        `Live checks pending; retry ${attempt}/5 after edge propagation.`,
      );
      await wait(5000);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await verifyPublishedDeployment(
    process.argv[2],
    process.argv[3],
    process.argv[4],
  );
}
