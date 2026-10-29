'use client';

import { Button } from '@honeymelon/ui/components/button';
import { useSyncExternalStore, type ReactElement } from 'react';
import { guessPlatform, systemName } from '../lib/downloads';

const subscribe = (): (() => void) => () => {};

/** The visitor's system name from the user agent, or empty on the server. */
function browserSystem(): string {
  const os = guessPlatform({
    userAgent: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints,
  }).os;

  return os ? systemName(os) : '';
}

/**
 * The primary call to action. It names the visitor's platform once the page
 * runs in a browser; the static HTML says "Download" so it never mismatches.
 */
export function DownloadCta({
  className = '',
}: {
  readonly className?: string;
}): ReactElement {
  const system = useSyncExternalStore(subscribe, browserSystem, () => '');

  return (
    <Button asChild size="lg" className={`hm-pill ${className}`}>
      <a href="/download/">{system ? `Download for ${system}` : 'Download'}</a>
    </Button>
  );
}
