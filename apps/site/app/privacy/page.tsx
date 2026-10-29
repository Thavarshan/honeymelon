import type { Metadata } from 'next';
import { getWebAppUrl, pageMetadata } from '../../src/lib/metadata';
import type { ReactElement } from 'react';

export const metadata: Metadata = pageMetadata(
  '/privacy/',
  'Privacy and limitations',
  'Understand local media processing, hosting logs and current browser limitations.',
);

/**
 * Product-specific disclosures, not a substitute for a reviewed legal policy.
 * Avoid promises about third-party hosting logs or external destinations.
 */
export default function PrivacyPage(): ReactElement {
  const webApp = getWebAppUrl();

  return (
    <main id="main-content" className="content-page" tabIndex={-1}>
      <p className="section-kicker">TRANSPARENCY / 002</p>
      <h1>Privacy and limitations</h1>
      <h2>Desktop media processing</h2>
      <p>
        Honeymelon desktop converts media on your own device. The normal
        conversion workflow does not send source media to a Honeymelon-operated
        conversion server or require a user account.
      </p>
      <h2>This website</h2>
      <p>
        This marketing website is designed as static pages, without an upload
        form, conversion endpoint, or account system. Hosting providers may
        process standard request information such as IP addresses and access
        logs; this page does not claim otherwise.
      </p>
      <h2>External services</h2>
      <p>
        Download, source code, and support links lead to GitHub. GitHub's
        privacy practices apply when you visit those pages.
      </p>
      <h2>Limits and safety</h2>
      <p>
        Supported input and output formats depend on the desktop version,
        operating system, and bundled encoders. Conversion can fail or change
        quality. Keep backup copies of important files. The 3.0 beta installers
        are unsigned; verify official release checksums before use.
      </p>
      {webApp ? (
        <>
          <h2>Honeymelon Web (beta)</h2>
          <p>
            <a href={webApp.href}>Honeymelon Web</a> converts files inside your
            browser tab. Selected files, decoded media and converted results
            stay in that tab&apos;s memory; they are not uploaded, logged or
            written to browser storage, and closing the tab discards them. The
            app has no account, analytics or conversion server, and its security
            policy only allows requests to its own origin.
          </p>
          <p>
            Your language, theme and output settings are saved in this
            browser&apos;s local storage. The offline cache holds the app&apos;s
            own files only. As with any website, the host may process request
            information such as IP addresses. Browser conversion supports fewer
            formats and smaller files than desktop; see the published limits
            before relying on it.
          </p>
        </>
      ) : (
        <p>
          Honeymelon Web is not publicly available yet. Any future browser
          feature needs separate verification before its privacy claims are
          published.
        </p>
      )}
      <p>
        <a href="https://github.com/Thavarshan/honeymelon/issues">
          Ask a question or report an issue
        </a>{' '}
        · <a href="/download/">Downloads</a>
      </p>
    </main>
  );
}
