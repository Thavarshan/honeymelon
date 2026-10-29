import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { pageMetadata } from '../../src/lib/metadata';

/** Link the actual repository license instead of inventing product terms. */
export const metadata: Metadata = pageMetadata(
  '/license/',
  'License and source',
  'Find Honeymelon source code, its MIT license, contribution guide and bundled software notices.',
);

/**
 * Keep source, licensing and contribution links available without JavaScript.
 */
export default function LicensePage(): ReactElement {
  return (
    <main id="main-content" className="content-page" tabIndex={-1}>
      <p className="eyebrow">License</p>
      <h1>Open for inspection.</h1>
      <p>
        Honeymelon is open-source software distributed under the MIT license.
        The repository contains the license text and copyright notice; preserve
        those notices when redistributing Honeymelon code.
      </p>
      <p>
        <a href="https://github.com/Thavarshan/honeymelon/blob/main/LICENSE">
          Read the MIT license
        </a>
        {' · '}
        <a href="https://github.com/Thavarshan/honeymelon">
          Explore the source
        </a>
      </p>
      <h2>Bundled software</h2>
      <p>
        Honeymelon uses third-party software and media tools. Those components
        have their own licenses and notices. Check the notices included with the
        specific desktop package you download; Honeymelon's MIT license does not
        replace the terms of its dependencies.
      </p>
      <h2>Contribute</h2>
      <p>
        Bug reports, documentation improvements, accessibility feedback and code
        contributions are welcome. Start with the contributor guide and discuss
        substantial changes in an issue before implementing them.
      </p>
      <p>
        <a href="https://github.com/Thavarshan/honeymelon/blob/main/.github/CONTRIBUTING.md">
          Read the contributor guide
        </a>
      </p>
    </main>
  );
}
