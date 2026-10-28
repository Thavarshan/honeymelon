import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { ShieldCheck, Github, MonitorCheck } from 'lucide-react';
import { DownloadLibrary } from '../../src/components/download-library';
import { OpenFromHash } from '../../src/components/open-from-hash';
import { SmartDownload } from '../../src/components/smart-download';
import { latestRelease } from '../../src/lib/downloads';
import { pageMetadata } from '../../src/lib/metadata';
import { releaseSnapshot } from '../../src/lib/release-snapshot';

/** Static page metadata is generated at build time. */
export const metadata: Metadata = pageMetadata(
  '/download/',
  'Download',
  'Download Honeymelon for Mac, Windows or Linux. The right package for your computer starts automatically; every version and platform is one click away.',
);

/**
 * The page detects the visitor's computer and starts the matching download;
 * everything else is a plain link. The release list is the build-time,
 * validated GitHub snapshot: no visitor-time API calls.
 */
export default function DownloadPage(): ReactElement {
  const manifest = releaseSnapshot();
  const stable = latestRelease(manifest, 'stable');

  return (
    <main id="main-content" className="download-page" tabIndex={-1}>
      <section className="download-hero" aria-labelledby="download-heading">
        <img
          className="download-hero__icon"
          src="/logo.svg"
          alt=""
          width="96"
          height="96"
        />
        <h1 id="download-heading">Download Honeymelon.</h1>
        <p className="download-hero__lead">
          Free media conversion for your computer. No account, no uploads.
        </p>
        {stable ? (
          <SmartDownload release={stable} />
        ) : (
          <p>
            No stable release is available yet.{' '}
            <a href="#all-downloads">See every published build</a>.
          </p>
        )}
      </section>

      <DownloadLibrary manifest={manifest} />
      <OpenFromHash />

      <section className="info-tiles" aria-label="Before you install">
        <article>
          <ShieldCheck aria-hidden="true" />
          <h2>Verify your download.</h2>
          <p>
            Compare a file&apos;s SHA-256 with the checksum published on its
            release, or with the release&apos;s SHA256SUMS file.{' '}
            <a href="/docs/#verify-download">How to verify</a>
          </p>
        </article>
        <article>
          <MonitorCheck aria-hidden="true" />
          <h2>Desktop first.</h2>
          <p>
            These packages install the desktop app. There is no live browser
            converter yet; Honeymelon Web will be linked here when it launches.
          </p>
        </article>
        <article>
          <Github aria-hidden="true" />
          <h2>Open source.</h2>
          <p>
            Every build comes from GitHub Releases, published from public source
            code under the MIT license.{' '}
            <a href="https://github.com/Thavarshan/honeymelon">View the code</a>
          </p>
        </article>
      </section>
    </main>
  );
}
