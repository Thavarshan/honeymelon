import { Badge } from '@honeymelon/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@honeymelon/ui/components/card';
import type { PublishedRelease, ReleaseManifest } from '@honeymelon/contracts';
import {
  AppWindow,
  ChevronDown,
  Command,
  Download,
  SquareTerminal,
} from 'lucide-react';
import type { ReactElement } from 'react';
import {
  desktopSystems,
  featuredBeta,
  formatDate,
  formatSize,
  isLegacyBuild,
  latestRelease,
  packageName,
  platformAssets,
  processorName,
  systemName,
  type DesktopOs,
} from '../lib/downloads';
import { releaseRepository } from '../lib/releases';

const icons = { macos: Command, windows: AppWindow, linux: SquareTerminal };
const anchors = { macos: 'mac', windows: 'windows', linux: 'linux' };
const subtitles = {
  macos: 'Apple silicon and Intel',
  windows: 'Windows 10 and 11',
  linux: 'Debian, Fedora and more',
};

/** One platform's packages as one-click rows: no selects, no forms. */
function PlatformCard({
  release,
  os,
  anchor,
}: {
  readonly release: PublishedRelease;
  readonly os: DesktopOs;
  readonly anchor?: string | undefined;
}): ReactElement | null {
  const assets = platformAssets(release, os);
  if (!assets.length) {
    return null;
  }

  const Icon = icons[os];

  return (
    <Card className="platform-card" id={anchor}>
      <CardHeader>
        <Icon className="platform-card__icon" aria-hidden="true" />
        <CardTitle>
          <h3>{systemName(os)}</h3>
        </CardTitle>
        <CardDescription>{subtitles[os]}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="package-list">
          {assets.map((asset) => (
            <li key={asset.id}>
              <a className="package-row" href={asset.url}>
                <span className="package-row__name">
                  <span className="sr-only">
                    Download Honeymelon {release.version} for {systemName(os)}
                    ,{' '}
                  </span>
                  {processorName(asset)}
                  <small>{packageName(asset)}</small>
                </span>
                <span className="package-row__size">
                  {formatSize(asset.size)}
                </span>
                <Download aria-hidden="true" className="package-row__icon" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Published SHA-256 digests, kept out of the rows but one click away. */
function Checksums({
  release,
}: {
  readonly release: PublishedRelease;
}): ReactElement | null {
  const digests = release.assets.filter((asset) => asset.checksum);
  if (!digests.length) {
    return null;
  }

  return (
    <details className="checksums">
      <summary>
        SHA-256 checksums for {release.version}
        <ChevronDown aria-hidden="true" />
      </summary>
      <dl>
        {digests.map((asset) => (
          <div key={asset.id}>
            <dt>{asset.name}</dt>
            <dd>
              <code>{asset.checksum!.value}</code>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** A release's three platform cards plus its notes and checksums. */
function ReleaseGrid({
  release,
  anchors: withAnchors = false,
}: {
  readonly release: PublishedRelease;
  readonly anchors?: boolean;
}): ReactElement {
  return (
    <>
      <div className="platform-grid">
        {desktopSystems.map((os) => (
          <PlatformCard
            key={os}
            release={release}
            os={os}
            anchor={withAnchors ? anchors[os] : undefined}
          />
        ))}
      </div>
      <p className="release-links">
        Released {formatDate(release.publishedAt)} ·{' '}
        <a href={release.url}>Release notes for {release.tag}</a>
      </p>
      <Checksums release={release} />
    </>
  );
}

/**
 * Every published package, grouped the way people think: latest stable, the
 * beta, then older versions. Rendered statically, so it works without
 * JavaScript and every link is a direct GitHub release asset.
 */
export function DownloadLibrary({
  manifest,
}: {
  readonly manifest: ReleaseManifest;
}): ReactElement {
  const stable = latestRelease(manifest, 'stable');
  const showBeta = featuredBeta(manifest);
  const earlier = manifest.releases.filter(
    (release) => release !== stable && release !== showBeta,
  );

  return (
    <>
      <section
        id="all-downloads"
        className="library-section"
        aria-labelledby="all-downloads-heading"
      >
        <div className="section-intro">
          <h2 id="all-downloads-heading">Every platform. One click.</h2>
          <p>
            {stable
              ? `Honeymelon ${stable.version} is the latest stable release.`
              : 'No stable release has been published yet.'}{' '}
            Pick any package; each link downloads it directly from GitHub.
          </p>
        </div>
        {stable && (
          <>
            {isLegacyBuild(stable) && (
              <p className="library-note">
                Released before the rename, so it installs as Comet.
              </p>
            )}
            <ReleaseGrid release={stable} anchors />
          </>
        )}
      </section>

      {showBeta && (
        <section
          id="beta"
          className="library-section library-section--beta"
          aria-labelledby="beta-heading"
        >
          <div className="section-intro">
            <Badge variant="outline" className="hm-badge">
              Beta
            </Badge>
            <h2 id="beta-heading">Try Honeymelon {showBeta.version}.</h2>
            <p>
              The next version, ready for testing. Beta builds are unsigned, so
              macOS and Windows will warn before opening them. Keep copies of
              important files.
            </p>
          </div>
          <ReleaseGrid release={showBeta} />
        </section>
      )}

      {earlier.length > 0 && (
        <section
          id="previous-versions"
          className="library-section"
          aria-labelledby="previous-heading"
        >
          <div className="section-intro">
            <h2 id="previous-heading">Previous versions.</h2>
            <p>
              Older releases stay available for anyone who needs them. They are
              published under the Comet name.
            </p>
          </div>
          <div className="version-list">
            {earlier.map((release) => (
              <details key={release.id} id={`v${release.version}`}>
                <summary>
                  <span className="version-list__name">{release.version}</span>
                  <Badge variant="secondary" className="hm-badge">
                    {release.channel === 'stable' ? 'Stable' : 'Prerelease'}
                  </Badge>
                  <time dateTime={release.publishedAt}>
                    {formatDate(release.publishedAt)}
                  </time>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <ReleaseGrid release={release} />
              </details>
            ))}
          </div>
        </section>
      )}
      <p className="library-footnote">
        Release list checked {formatDate(manifest.verifiedAt)}.{' '}
        <a href={releaseRepository}>All releases on GitHub</a>
      </p>
    </>
  );
}
