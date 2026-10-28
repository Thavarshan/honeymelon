import type { Metadata } from 'next';
import { pageMetadata } from '../../src/lib/metadata';
import type { ReactElement } from 'react';

/** Search metadata is generated at build time, with no tracking scripts. */
export const metadata: Metadata = pageMetadata(
  '/docs/',
  'Getting started',
  'Install Honeymelon desktop, verify downloads and troubleshoot local media conversion.',
);

/**
 * Beginner-friendly guidance avoids claiming browser conversion exists.
 */
export default function GettingStartedPage(): ReactElement {
  return (
    <main id="main-content" className="content-page" tabIndex={-1}>
      <p className="eyebrow">Docs</p>
      <h1>Getting started with Honeymelon</h1>
      <p>
        Honeymelon is a local desktop media converter. The browser converter is
        planned, not available.
      </p>
      <h2>1. Choose a release</h2>
      <p>
        Start with the published stable desktop release. The 3.0 beta is
        unsigned and may trigger operating-system trust warnings.
      </p>
      <p>
        <a href="/download/">Compare stable and beta downloads</a>
      </p>
      <h2 id="verify-download">2. Verify and install</h2>
      <p>
        Download only from the official GitHub Releases page. Compare the
        downloaded file against its published SHA-256 checksum before
        installing. Do not bypass a warning for a file whose origin or hash you
        cannot verify.
      </p>
      <p>
        The 3.0 beta publishes SHA256SUMS. Older stable releases may not include
        it; if your release has no published checksum, this check is not
        available. Do not substitute a checksum from another version.
      </p>
      <p>
        Keep the release's SHA256SUMS file beside your download. In a terminal,
        replace PACKAGE with the exact downloaded filename and compare the full
        64-character result with the matching entry in SHA256SUMS.
      </p>
      <dl className="checksum-commands">
        <dt>macOS Terminal</dt>
        <dd>
          <code>shasum -a 256 PACKAGE</code>
        </dd>
        <dt>Linux terminal</dt>
        <dd>
          <code>sha256sum PACKAGE</code>
        </dd>
        <dt>Windows PowerShell</dt>
        <dd>
          <code>Get-FileHash -Algorithm SHA256 .\PACKAGE</code>
        </dd>
      </dl>
      <p>
        A checksum detects a changed or incomplete download; it does not replace
        publisher signing or notarization. If it does not match, delete the
        download and report the discrepancy before installing.
      </p>
      <h2>3. Convert a local file</h2>
      <p>
        Open Honeymelon, select a source file, choose an output supported by
        your installed version, and select a destination. Available formats and
        controls vary by platform and encoder. Keep the original until you have
        checked the result.
      </p>
      <h2>4. Troubleshoot or contribute</h2>
      <p>
        When reporting a problem, include your Honeymelon version, operating
        system, input and output formats, expected result, actual result, and
        steps to reproduce. Never attach private media to a public issue.
      </p>
      <p>
        <a href="https://github.com/Thavarshan/honeymelon/issues">
          Report an issue on GitHub
        </a>{' '}
        ·{' '}
        <a href="https://github.com/Thavarshan/honeymelon/blob/main/.github/CONTRIBUTING.md">
          Contributor guide
        </a>
      </p>
      <h2>Frequently asked questions</h2>
      <h3>Do I need an account?</h3>
      <p>No account is required for the desktop conversion workflow.</p>
      <h3>Does Honeymelon upload my files?</h3>
      <p>
        The desktop conversion workflow processes source media locally rather
        than uploading it to a Honeymelon conversion server. External websites
        linked from this site have their own policies.
      </p>
      <h3>Can I use Honeymelon offline?</h3>
      <p>
        Desktop media conversion runs locally. Downloading the application,
        visiting documentation and checking GitHub releases require a network
        connection. Keep the installed app and required media on your device.
      </p>
      <h3>Why did a conversion fail or change the result?</h3>
      <p>
        Check the output format, available disk space and release notes.
        Unsupported codecs, damaged inputs and protected media can prevent
        conversion. Lossy formats may change quality; compare the result before
        removing the source.
      </p>
      <h3>Can I convert files in my browser?</h3>
      <p>
        Not yet. Browser conversion is a roadmap item, and supported codecs may
        differ from desktop when it arrives.
      </p>
    </main>
  );
}
