'use client';

import { useEffect } from 'react';

/**
 * Open the `<details>` a link points at (for example `/download/#v2.2.2`) and
 * bring it into view. Without JavaScript the section is still reachable; it
 * just stays collapsed.
 */
export function OpenFromHash(): null {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target instanceof HTMLDetailsElement && !target.open) {
        target.open = true;
        target.scrollIntoView({ block: 'start' });
      }
    };

    open();
    window.addEventListener('hashchange', open);

    return () => window.removeEventListener('hashchange', open);
  }, []);

  return null;
}
