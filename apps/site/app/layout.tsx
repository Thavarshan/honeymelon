import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { SiteHeader } from '../src/components/site-header';
import { MotionToggle } from '../src/components/motion-toggle';
import { getWebAppUrl, pageMetadata } from '../src/lib/metadata';
import './globals.css';

/**
 * Next.js turns this object into ordinary HTML metadata at build time.
 * No server request or user tracking is required to show these values.
 */
export const metadata: Metadata = {
  ...pageMetadata(
    '/',
    'Honeymelon — Local media conversion',
    'Convert video, audio and images on your own computer. Open source, local processing, no conversion account.',
  ),
  title: {
    default: 'Honeymelon — Local media conversion',
    template: '%s · Honeymelon',
  },
  icons: { icon: '/logo.svg' },
};

/** Layout receives a page from the Next.js router as its children. */
interface RootLayoutProps {
  readonly children: ReactNode;
}

/**
 * Shared site chrome: brand, navigation, skip link, and footer.
 *
 * The surrounding layout stays a Server Component. The navigation and motion
 * controls use client-side React, so the marketing pages remain statically
 * exportable and do not require a Node.js server.
 */
export default function RootLayout({
  children,
}: RootLayoutProps): ReactElement {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader webAppUrl={getWebAppUrl()?.href} />
          {children}
          <footer className="site-footer">
            <div className="site-footer__inner">
              <p className="site-footer__lead">
                Honeymelon is free and open source media conversion for your
                computer. Your files stay yours.
              </p>
              <div className="footer-grid">
                <nav aria-label="Product">
                  <h2>Product</h2>
                  <a href="/features/">Features</a>
                  <a href="/download/">Download</a>
                  <a href="/releases/">Releases</a>
                  <a href="/docs/">Documentation</a>
                </nav>
                <nav aria-label="Community">
                  <h2>Community</h2>
                  <a href="https://github.com/Thavarshan/honeymelon">GitHub</a>
                  <a href="https://github.com/Thavarshan/honeymelon/issues">
                    Support
                  </a>
                  <a href="https://github.com/Thavarshan/honeymelon/blob/main/.github/CONTRIBUTING.md">
                    Contribute
                  </a>
                </nav>
                <nav aria-label="Legal">
                  <h2>Legal</h2>
                  <a href="/privacy/">Privacy</a>
                  <a href="/license/">License</a>
                </nav>
              </div>
              <div className="footer-bottom">
                <p>Honeymelon. Free &amp; open source under the MIT license.</p>
                <MotionToggle />
                <p>macOS · Windows · Linux</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
