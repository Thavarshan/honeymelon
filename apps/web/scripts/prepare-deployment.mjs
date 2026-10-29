import { readFile, writeFile } from 'node:fs/promises';
import { previewHeaders } from '../../site/scripts/deployment-policy.mjs';

const target = process.argv[2];
const revision = process.argv[3];
if (
  !['preview', 'production'].includes(target) ||
  !/^[a-f0-9]{40}$/.test(revision ?? '')
) {
  throw new Error('Prepare deployment with a target and exact source revision');
}

const output = new URL('../dist/', import.meta.url);
const headersFile = new URL('_headers', output);
if (target === 'preview') {
  await writeFile(
    headersFile,
    previewHeaders(await readFile(headersFile, 'utf8')),
  );
}

// Not precached by the service worker: it identifies the live revision only.
await writeFile(
  new URL('deployment.json', output),
  JSON.stringify({ environment: target, revision }, null, 2) + '\n',
);
console.log(`Prepared static web ${target} deployment for ${revision}`);
