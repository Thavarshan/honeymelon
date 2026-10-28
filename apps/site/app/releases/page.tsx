import { Badge } from '@honeymelon/ui/components/badge';
import { Button } from '@honeymelon/ui/components/button';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  desktopSystems,
  downloadAnchor,
  formatDate,
  isLegacyBuild,
  latestRelease,
  systemName,
} from '../../src/lib/downloads';
import { pageMetadata } from '../../src/lib/metadata';
import { releaseSnapshot } from '../../src/lib/release-snapshot';
import { releaseRepository } from '../../src/lib/releases';

const channelNames = { stable: 'Stable', prerelease: 'Prerelease' } as const;

/** Release facts remain on GitHub, where the published artifacts live. */
export const metadata: Metadata = pageMetadata(
  '/releases/',
  'Releases and updates',
  'Find official Honeymelon release notes, stable downloads and beta testing guidance.',
);

/**
 * A "what's new" timeline. Notes come verbatim from the validated build-time
 * snapshot of GitHub Releases; development builds never appear here.
 */
export default function ReleasesPage(): ReactElement {
  const manifest = releaseSnapshot();
  const stable = latestRelease(manifest, 'stable');

  return (
    <main id="main-content" className="releases-page" tabIndex={-1}>
      <section className="page-hero" aria-labelledby="releases-heading">
        <p className="eyebrow">Releases</p>
        <h1 id="releases-heading">What&apos;s new in Honeymelon.</h1>
        <p className="page-hero__lead">
          Every published version, with its notes and downloads. GitHub Releases
          is the source of truth; a successful development build is not a
          release.
        </p>
        <div className="cta-row">
          <Button asChild size="lg" className="hm-pill">
            <a href="/download/">Download the latest</a>
          </Button>
          <a className="chevron-link" href={releaseRepository}>
            All releases on GitHub <ChevronRight aria-hidden="true" />
          </a>
        </div>
      </section>

      <ol className="timeline" aria-label="Published releases">
        {manifest.releases.map((release) => (
          <li key={release.id} className="timeline__entry">
            <time dateTime={release.publishedAt}>
              {formatDate(release.publishedAt)}
            </time>
            <article>
              <header>
                <h2>{release.tag}</h2>
                <Badge
                  variant={release.channel === 'stable' ? 'default' : 'outline'}
                  className="hm-badge"
                >
                  {release === stable
                    ? 'Latest stable'
                    : channelNames[release.channel]}
                </Badge>
              </header>
              <p>
                {release.assets.length} packages for{' '}
                {desktopSystems
                  .filter((os) =>
                    release.assets.some((asset) => asset.os === os),
                  )
                  .map(systemName)
                  .join(', ')
                  .replace(/, ([^,]*)$/, ' and $1')}
                .{isLegacyBuild(release) && ' Published under the Comet name.'}
              </p>
              <p className="timeline__links">
                <a href={`/download/#${downloadAnchor(manifest, release)}`}>
                  Downloads <ChevronRight aria-hidden="true" />
                </a>
                <a href={release.url}>
                  {release.tag} on GitHub <ChevronRight aria-hidden="true" />
                </a>
              </p>
              <details className="release-notes">
                <summary>
                  Release notes for {release.tag}
                  <ChevronDown aria-hidden="true" />
                </summary>
                <pre>{release.notes || 'No release notes were published.'}</pre>
              </details>
            </article>
          </li>
        ))}
      </ol>

      <section className="content-narrow" aria-labelledby="report-heading">
        <h2 id="report-heading">Report a regression.</h2>
        <p>
          Include the working and failing versions, operating system, input and
          output formats, and reproduction steps in a GitHub issue. Share a
          non-private sample only when you have permission to publish it.{' '}
          <a href="https://github.com/Thavarshan/honeymelon/issues">
            Report a release problem
          </a>
        </p>
      </section>
    </main>
  );
}
