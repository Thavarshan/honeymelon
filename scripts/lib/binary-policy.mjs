import { createHash } from 'node:crypto';

const ffmpegBuildsRelease = /^\/releases\/download\/autobuild-[\d-]+\/[\w.-]+$/;
const githubSources = new Map([
  ['eugeneware/ffmpeg-static', /^\/releases\/download\/b6\.1\.1\/[\w.-]+$/],
  ['BtbN/FFmpeg-Builds', ffmpegBuildsRelease],
  ['FFmpeg-Builds/FFmpeg-Builds', ffmpegBuildsRelease],
]);
const sources = new Map([
  [
    'ffmpeg.martin-riedl.de',
    /^\/download\/macos\/(?:arm64|amd64)\/[\d._]+\/(?:ffmpeg\.zip|ffprobe\.zip|versions\.txt)$/,
  ],
  ['raw.githubusercontent.com', /^\/FFmpeg\/FFmpeg\/n[\d.]+\/LICENSE\.md$/],
]);
const redirectHosts = new Set([
  'release-assets.githubusercontent.com',
  'objects.githubusercontent.com',
]);
const maximumBytes = 512 * 1024 * 1024;

/** Permit public, pinned upstream resources without embedded credentials. */
export function downloadUrl(value, redirect = false) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  ) {
    throw new Error('Binary downloads require credential-free HTTPS URLs');
  }

  if (redirect && redirectHosts.has(url.hostname)) {
    return url.href;
  }

  const githubPath = url.pathname.match(/^\/([^/]+\/[^/]+)(\/.*)$/);
  const githubAllowed = githubPath
    ? githubSources.get(githubPath[1])?.test(githubPath[2])
    : false;
  const sourceAllowed = sources.get(url.hostname)?.test(url.pathname);
  if (
    url.search ||
    !(url.hostname === 'github.com' ? githubAllowed : sourceAllowed)
  ) {
    throw new Error('Binary download source is not allowlisted');
  }

  return url.href;
}

/** A digest must be a fixed filename, never an arbitrary cache path. */
export function validateDigest(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error('A pinned SHA-256 digest is required');
  }

  return value;
}

/** Do not publish downloaded bytes until the committed digest matches. */
export function verifyDownload(bytes, expected) {
  validateDigest(expected);
  if (createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error('Binary download SHA-256 mismatch');
  }

  return bytes;
}

/** Validate redirect destinations and bound download resources. */
export async function fetchBinary(file, fetcher = fetch) {
  validateDigest(file.sha256);
  let url = downloadUrl(file.url);
  const signal = AbortSignal.timeout(120000);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetcher(url, { redirect: 'manual', signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) {
        throw new Error('Binary download redirect has no location');
      }

      url = downloadUrl(new URL(location, url).href, true);
      continue;
    }

    if (!response.ok || !response.body) {
      throw new Error(`Binary download failed: ${response.status}`);
    }

    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.byteLength;
      if (length > maximumBytes) {
        throw new Error('Binary download exceeds the size limit');
      }

      chunks.push(chunk);
    }

    return verifyDownload(Buffer.concat(chunks), file.sha256);
  }

  throw new Error('Too many binary download redirects');
}
