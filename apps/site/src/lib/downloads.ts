import type {
  PublishedRelease,
  ReleaseAsset,
  ReleaseManifest,
} from '@honeymelon/contracts';

/** Desktop systems Honeymelon publishes packages for. */
export type DesktopOs = 'macos' | 'windows' | 'linux';

/** Platforms in the order the download page presents them. */
export const desktopSystems: readonly DesktopOs[] = [
  'macos',
  'windows',
  'linux',
];

/** What the browser reveals about the visitor's computer. */
export interface PlatformGuess {
  os: DesktopOs | null;
  arch: 'x64' | 'arm64' | null;
  linuxFormat: 'deb' | 'rpm' | null;
  mobile: boolean;
}

/** Signals collected in the browser; every field is optional. */
export interface BrowserSignals {
  userAgent: string;
  /** `navigator.userAgentData.platform` (Chromium). */
  platform?: string | undefined;
  /** `architecture` and `bitness` high-entropy hints (Chromium). */
  architecture?: string | undefined;
  bitness?: string | undefined;
  /** Unmasked WebGL renderer, the only CPU clue Safari and Firefox give. */
  gpu?: string | undefined;
  /** iPadOS reports a Mac user agent but has touch points. */
  touchPoints?: number | undefined;
}

/**
 * Interpret browser signals conservatively. Unknown stays unknown: a wrong
 * guess would download a package that cannot run.
 */
export function guessPlatform(signals: BrowserSignals): PlatformGuess {
  const ua = signals.userAgent;
  const hint = (signals.platform ?? '').toLowerCase();
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    hint === 'android' ||
    hint === 'ios' ||
    (/Macintosh/.test(ua) && (signals.touchPoints ?? 0) > 1);
  if (mobile) {
    return { os: null, arch: null, linuxFormat: null, mobile: true };
  }

  let os: DesktopOs | null = null;
  if (hint === 'windows' || /Windows/i.test(ua)) {
    os = 'windows';
  } else if (hint === 'macos' || /Macintosh|Mac OS X/i.test(ua)) {
    os = 'macos';
  } else if (
    hint === 'linux' ||
    hint === 'chrome os' ||
    /Linux|X11/i.test(ua)
  ) {
    os = /CrOS/.test(ua) || hint === 'chrome os' ? null : 'linux';
  }

  let arch: PlatformGuess['arch'] = null;
  const architecture = (signals.architecture ?? '').toLowerCase();
  if (architecture === 'arm') {
    arch = 'arm64';
  } else if (architecture === 'x86' && signals.bitness !== '32') {
    arch = 'x64';
  } else if (os === 'linux' && /aarch64|arm64/i.test(ua)) {
    arch = 'arm64';
  } else if (os === 'linux' && /x86_64|amd64/i.test(ua)) {
    arch = 'x64';
  } else if (os === 'macos' && signals.gpu) {
    // Safari masks every Mac GPU as "Apple GPU", so only explicit names count.
    if (/Apple M\d/i.test(signals.gpu)) {
      arch = 'arm64';
    } else if (/Intel|AMD|Radeon|NVIDIA/i.test(signals.gpu)) {
      arch = 'x64';
    }
  }

  let linuxFormat: PlatformGuess['linuxFormat'] = null;
  if (os === 'linux') {
    if (/Ubuntu|Debian|Mint|Pop!_OS|elementary/i.test(ua)) {
      linuxFormat = 'deb';
    } else if (/Fedora|Red Hat|CentOS|Rocky|AlmaLinux|SUSE/i.test(ua)) {
      linuxFormat = 'rpm';
    }
  }

  return { os, arch, linuxFormat, mobile: false };
}

/** Newest published release on a channel; the snapshot is sorted. */
export function latestRelease(
  manifest: ReleaseManifest,
  channel: PublishedRelease['channel'],
): PublishedRelease | undefined {
  return manifest.releases.find(
    (release) =>
      release.channel === channel &&
      release.assets.some((asset) => asset.os && asset.arch),
  );
}

/** The prerelease worth featuring: only one newer than the latest stable. */
export function featuredBeta(
  manifest: ReleaseManifest,
): PublishedRelease | undefined {
  const stable = latestRelease(manifest, 'stable');
  const beta = latestRelease(manifest, 'prerelease');

  return beta && (!stable || beta.publishedAt > stable.publishedAt)
    ? beta
    : undefined;
}

/** Where a release's packages live on the download page. */
export function downloadAnchor(
  manifest: ReleaseManifest,
  release: PublishedRelease,
): string {
  if (release === latestRelease(manifest, 'stable')) {
    return 'all-downloads';
  }

  return release === featuredBeta(manifest) ? 'beta' : `v${release.version}`;
}

const formatRank: Record<string, number> = {
  exe: 0,
  zip: 1,
  deb: 2,
  rpm: 3,
  appimage: 4,
  'tar.gz': 5,
};

/**
 * Every asset for one system, preferred variants first. Packages with an
 * unknown processor are listed last and are never recommended.
 */
export function platformAssets(
  release: PublishedRelease,
  os: DesktopOs,
): ReleaseAsset[] {
  return release.assets
    .filter((asset) => asset.os === os)
    .sort(
      (a, b) =>
        // Known processors first; Apple silicon and x64 lead; then format.
        Number(a.arch === null) - Number(b.arch === null) ||
        (os === 'macos'
          ? Number(a.arch !== 'arm64') - Number(b.arch !== 'arm64')
          : Number(a.arch !== 'x64') - Number(b.arch !== 'x64')) ||
        (formatRank[a.format] ?? 9) - (formatRank[b.format] ?? 9),
    );
}

/** The outcome of matching a guess against a release. */
export interface Recommendation {
  /** The single best package; present only when the match is certain. */
  asset?: ReleaseAsset | undefined;
  /** One-click alternatives when the browser cannot decide for the user. */
  choices: ReleaseAsset[];
}

/**
 * Pick the package to download automatically, or the shortest list of
 * one-click choices when the browser cannot know (Mac CPU, Linux packaging).
 */
export function recommend(
  release: PublishedRelease,
  guess: PlatformGuess,
): Recommendation {
  if (!guess.os) {
    return { choices: [] };
  }

  const assets = platformAssets(release, guess.os).filter(
    (asset) => asset.arch !== null,
  );
  if (guess.os === 'macos') {
    const match = assets.find((asset) => asset.arch === guess.arch);

    return match
      ? { asset: match, choices: [] }
      : { choices: uniqueBy(assets, (asset) => asset.arch) };
  }

  if (guess.os === 'windows') {
    // x64 runs on Windows 11 on ARM through emulation, so it is a safe default.
    const arch = guess.arch ?? 'x64';
    const match =
      assets.find((asset) => asset.arch === arch && asset.format === 'exe') ??
      assets.find((asset) => asset.arch === arch);

    return match ? { asset: match, choices: [] } : { choices: assets };
  }

  const forArch = assets.filter(
    (asset) => asset.arch === (guess.arch ?? 'x64'),
  );
  const match = forArch.find((asset) => asset.format === guess.linuxFormat);

  return match && guess.arch
    ? { asset: match, choices: [] }
    : { choices: forArch.length ? forArch : assets };
}

function uniqueBy<T>(items: T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();

  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) {
      return false;
    }

    seen.add(value);

    return true;
  });
}

/** Human names, Apple style: "Mac", not "macos". */
export function systemName(os: DesktopOs): string {
  return { macos: 'Mac', windows: 'Windows', linux: 'Linux' }[os];
}

/** Processor wording that matches what each system calls it. */
export function processorName(asset: ReleaseAsset): string {
  if (!asset.arch) {
    return 'Processor not stated';
  }

  if (asset.os === 'macos') {
    return asset.arch === 'arm64' ? 'Apple silicon' : 'Intel';
  }

  return asset.arch === 'arm64' ? 'ARM64' : 'x64';
}

/** What the file is, in plain words. */
export function packageName(asset: ReleaseAsset): string {
  switch (asset.format) {
    case 'exe':
      return 'Installer';
    case 'zip':
      return asset.os === 'macos' ? 'App (.zip)' : 'Portable (.zip)';
    case 'deb':
      return 'Debian, Ubuntu (.deb)';
    case 'rpm':
      return 'Fedora, openSUSE (.rpm)';
    case 'appimage':
      return 'AppImage';
    case 'tar.gz':
      return 'Any distribution (.tar.gz)';
    case 'appx':
      return 'App package (.appx)';
    default:
      return asset.format;
  }
}

/** Decimal megabytes, as operating systems show download sizes. */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1e6)} MB`;
}

/** Short, unambiguous release dates without a locale-dependent server. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** Releases published before the rename still install as Comet. */
export function isLegacyBuild(release: PublishedRelease): boolean {
  return release.assets.some((asset) => /comet/i.test(asset.name));
}
