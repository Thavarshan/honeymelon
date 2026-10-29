import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  downloadAnchor,
  featuredBeta,
  guessPlatform,
  isLegacyBuild,
  latestRelease,
  packageName,
  platformAssets,
  processorName,
  recommend,
} from '../src/lib/downloads.ts';
import { validateManifest } from '../src/lib/releases.ts';

const manifest = validateManifest(
  JSON.parse(
    await readFile(new URL('../src/data/releases.json', import.meta.url)),
  ),
);
const stable = latestRelease(manifest, 'stable');
const beta = latestRelease(manifest, 'prerelease');

const ua = {
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  ubuntu:
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  fedoraArm:
    'Mozilla/5.0 (X11; Fedora; Linux aarch64; rv:140.0) Gecko/20100101 Firefox/140.0',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromebook:
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

test('latest releases come from the verified snapshot, newest first', () => {
  assert.equal(stable?.version, '2.2.3');
  assert.equal(beta?.version, '3.0.0-beta.1');
  assert.equal(isLegacyBuild(stable), true);
});

test('platform guesses never invent an architecture', () => {
  assert.deepEqual(guessPlatform({ userAgent: ua.mac }), {
    os: 'macos',
    arch: null,
    linuxFormat: null,
    mobile: false,
  });
  // Safari reports "Apple GPU" for every Mac, so it proves nothing.
  assert.equal(
    guessPlatform({ userAgent: ua.mac, gpu: 'Apple GPU' }).arch,
    null,
  );
  assert.equal(
    guessPlatform({ userAgent: ua.mac, gpu: 'ANGLE (Apple, Apple M2, OpenGL)' })
      .arch,
    'arm64',
  );
  assert.equal(
    guessPlatform({ userAgent: ua.mac, gpu: 'Intel(R) Iris(TM) Plus' }).arch,
    'x64',
  );
  assert.equal(
    guessPlatform({ userAgent: ua.windows, architecture: 'arm', bitness: '64' })
      .arch,
    'arm64',
  );
  assert.deepEqual(guessPlatform({ userAgent: ua.ubuntu }), {
    os: 'linux',
    arch: 'x64',
    linuxFormat: 'deb',
    mobile: false,
  });
  assert.equal(guessPlatform({ userAgent: ua.fedoraArm }).linuxFormat, 'rpm');
  assert.equal(guessPlatform({ userAgent: ua.iphone }).mobile, true);
  assert.equal(
    guessPlatform({ userAgent: ua.mac, touchPoints: 5 }).mobile,
    true,
    'iPadOS presents a Mac user agent',
  );
  assert.equal(guessPlatform({ userAgent: ua.chromebook }).os, null);
});

test('confident matches choose one exact package automatically', () => {
  const pick = (signals) => recommend(stable, guessPlatform(signals)).asset;

  assert.equal(
    pick({ userAgent: ua.windows }).name,
    'comet-2.2.3-x64-setup.exe',
  );
  assert.equal(
    pick({ userAgent: ua.windows, architecture: 'arm', bitness: '64' }).name,
    'comet-2.2.3-arm64-setup.exe',
  );
  assert.equal(
    pick({ userAgent: ua.mac, gpu: 'Apple M3 Pro' }).name,
    'Comet-darwin-arm64-2.2.3.zip',
  );
  assert.equal(pick({ userAgent: ua.ubuntu }).name, 'comet_2.2.3_amd64.deb');
  assert.equal(
    pick({ userAgent: ua.fedoraArm }).name,
    'comet-2.2.3-1.arm64.rpm',
  );
});

test('uncertain matches offer one-click choices instead of guessing', () => {
  const mac = recommend(stable, guessPlatform({ userAgent: ua.mac }));
  assert.equal(mac.asset, undefined);
  assert.deepEqual(
    mac.choices.map((asset) => processorName(asset)),
    ['Apple silicon', 'Intel'],
  );
  const linux = recommend(beta, guessPlatform({ userAgent: ua.linux }));
  assert.equal(linux.asset, undefined);
  assert.deepEqual(
    linux.choices.map((asset) => asset.format),
    ['deb', 'rpm', 'tar.gz'],
  );
  assert.deepEqual(recommend(stable, guessPlatform({ userAgent: ua.iphone })), {
    choices: [],
  });
});

test('every platform lists installable packages in a sensible order', () => {
  assert.deepEqual(
    platformAssets(beta, 'windows').map(
      (asset) => `${processorName(asset)} ${packageName(asset)}`,
    ),
    [
      'x64 Installer',
      'x64 Portable (.zip)',
      'ARM64 Installer',
      'ARM64 Portable (.zip)',
    ],
  );
  // Legacy packages without a stated processor stay listed, never chosen.
  const legacy = manifest.releases.find(
    (release) => release.version === '1.0.0',
  );
  assert.deepEqual(
    platformAssets(legacy, 'windows')
      .map((asset) => asset.name)
      .at(-1),
    'Comet.appx',
  );
  assert.ok(
    manifest.releases.every((release) =>
      release.assets.every((asset) => asset.os !== null),
    ),
    'Every published asset belongs to a desktop system',
  );
});

test('download anchors agree with the sections the library renders', () => {
  assert.equal(featuredBeta(manifest), beta);
  assert.equal(downloadAnchor(manifest, stable), 'all-downloads');
  assert.equal(downloadAnchor(manifest, beta), 'beta');
  const older = manifest.releases.find(
    (release) => release.version === '2.2.2',
  );
  assert.equal(downloadAnchor(manifest, older), 'v2.2.2');
});
