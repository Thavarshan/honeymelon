'use client';

import { Button } from '@honeymelon/ui/components/button';
import type { PublishedRelease, ReleaseAsset } from '@honeymelon/contracts';
import { ArrowDown, ChevronRight, Download } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  guessPlatform,
  isLegacyBuild,
  packageName,
  processorName,
  recommend,
  systemName,
  formatSize,
  type PlatformGuess,
} from '../lib/downloads';

/** Seconds between showing the match and starting the download. */
const countdownSeconds = 3;

/** Remembers, per tab, which file already started so reloads don't repeat. */
const startedKey = 'honeymelon:auto-download';

type Phase =
  | { kind: 'detecting' }
  | { kind: 'counting'; asset: ReleaseAsset; seconds: number }
  | { kind: 'started'; asset: ReleaseAsset }
  | { kind: 'ready'; asset: ReleaseAsset }
  | { kind: 'choose'; choices: ReleaseAsset[]; guess: PlatformGuess }
  | { kind: 'mobile' }
  | { kind: 'unknown' };

/**
 * Read what the browser will say about the computer. High-entropy client
 * hints (Chromium) and the WebGL renderer name (Safari, Firefox) are the
 * only processor clues; both are optional.
 */
async function browserGuess(): Promise<PlatformGuess> {
  const data = (
    navigator as Navigator & {
      userAgentData?: {
        platform?: string;
        getHighEntropyValues?(
          hints: string[],
        ): Promise<{ architecture?: string; bitness?: string }>;
      };
    }
  ).userAgentData;
  const hints = await data
    ?.getHighEntropyValues?.(['architecture', 'bitness'])
    .catch(() => undefined);
  let gpu: string | undefined;
  if (/Macintosh/.test(navigator.userAgent)) {
    try {
      const context = document
        .createElement('canvas')
        .getContext('webgl') as WebGLRenderingContext | null;
      const debug = context?.getExtension('WEBGL_debug_renderer_info');
      gpu = String(
        context?.getParameter(
          debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER,
        ) ?? '',
      );
    } catch {
      gpu = undefined;
    }
  }

  return guessPlatform({
    userAgent: navigator.userAgent,
    platform: data?.platform,
    architecture: hints?.architecture,
    bitness: hints?.bitness,
    gpu,
    touchPoints: navigator.maxTouchPoints,
  });
}

/** Opting out: `?auto=0`, a deep link to a section, or an earlier start. */
function autoAllowed(asset: ReleaseAsset): boolean {
  if (
    new URLSearchParams(location.search).get('auto') === '0' ||
    location.hash
  ) {
    return false;
  }

  try {
    return sessionStorage.getItem(startedKey) !== asset.url;
  } catch {
    return true;
  }
}

function describe(asset: ReleaseAsset): string {
  return [
    processorName(asset),
    packageName(asset),
    formatSize(asset.size),
  ].join(' · ');
}

/**
 * Detect the visitor's computer and start the right download automatically,
 * Apple style. Uncertain cases get one-click choices, never a guess, and
 * every package stays linked below for anyone who wants something else.
 */
export function SmartDownload({
  release,
}: {
  readonly release: PublishedRelease;
}): ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: 'detecting' });
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    let disposed = false;
    void browserGuess().then((guess) => {
      if (disposed) {
        return;
      }

      if (guess.mobile) {
        setPhase({ kind: 'mobile' });

        return;
      }

      const { asset, choices } = recommend(release, guess);
      if (asset) {
        setPhase(
          autoAllowed(asset)
            ? { kind: 'counting', asset, seconds: countdownSeconds }
            : { kind: 'ready', asset },
        );
      } else if (choices.length) {
        setPhase({ kind: 'choose', choices, guess });
      } else {
        setPhase({ kind: 'unknown' });
      }
    });

    return () => {
      disposed = true;
    };
  }, [release]);
  useEffect(() => {
    if (phase.kind !== 'counting') {
      return;
    }

    timer.current = window.setTimeout(() => {
      if (phase.seconds > 1) {
        setPhase({ ...phase, seconds: phase.seconds - 1 });

        return;
      }

      try {
        sessionStorage.setItem(startedKey, phase.asset.url);
      } catch {
        /* Private modes may block storage; the download still starts. */
      }

      setPhase({ kind: 'started', asset: phase.asset });
      // GitHub serves release assets as attachments, so the page stays put.
      window.location.assign(phase.asset.url);
    }, 1000);

    return () => window.clearTimeout(timer.current);
  }, [phase]);
  const asset =
    phase.kind === 'counting' ||
    phase.kind === 'started' ||
    phase.kind === 'ready'
      ? phase.asset
      : undefined;

  return (
    <div className="smart-download" data-phase={phase.kind}>
      <p className="smart-download__version">
        Honeymelon {release.version}
        {asset?.os ? ` for ${systemName(asset.os)}` : ''}
      </p>
      {asset && (
        <>
          <Button asChild size="lg" className="hm-pill hm-pill--large">
            <a href={asset.url}>
              <Download aria-hidden="true" /> Download
              <span className="sr-only">
                {' '}
                Honeymelon {release.version} for {systemName(asset.os!)},{' '}
                {describe(asset)}
              </span>
            </a>
          </Button>
          <p className="smart-download__meta">{describe(asset)}</p>
        </>
      )}
      {phase.kind === 'choose' && (
        <>
          <p className="smart-download__prompt">
            {phase.guess.os === 'macos'
              ? 'Which chip does your Mac have?'
              : 'Which package suits your system?'}
          </p>
          <div className="smart-download__choices">
            {phase.choices.map((choice, index) => (
              <Button
                key={choice.id}
                asChild
                size="lg"
                variant={index === 0 ? 'default' : 'outline'}
                className="hm-pill hm-pill--choice"
              >
                <a href={choice.url}>
                  <span>
                    {phase.guess.os === 'macos'
                      ? processorName(choice)
                      : packageName(choice)}
                  </span>
                  <small>
                    {phase.guess.os === 'macos'
                      ? `${packageName(choice)} · ${formatSize(choice.size)}`
                      : `${processorName(choice)} · ${formatSize(choice.size)}`}
                  </small>
                  <span className="sr-only">
                    {' '}
                    Download Honeymelon {release.version} for{' '}
                    {systemName(choice.os!)}
                  </span>
                </a>
              </Button>
            ))}
          </div>
          {phase.guess.os === 'macos' && (
            <p className="smart-download__help">
              Not sure? Open the Apple menu and choose About This Mac. Macs from
              late 2020 onwards usually have Apple silicon (M1 or later).
            </p>
          )}
        </>
      )}
      <div className="smart-download__status" aria-live="polite">
        {phase.kind === 'detecting' && (
          <p>
            Free for Mac, Windows and Linux.{' '}
            <a href="#all-downloads">Choose your platform</a>
          </p>
        )}
        {phase.kind === 'counting' && (
          <p>
            Your download will begin in{' '}
            {/* Announce once; a per-second count would interrupt readers. */}
            <span aria-hidden="true">
              {phase.seconds} {phase.seconds === 1 ? 'second' : 'seconds'}
            </span>
            <span className="sr-only">a few seconds</span>.{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => setPhase({ kind: 'ready', asset: phase.asset })}
            >
              Cancel
            </button>
          </p>
        )}
        {phase.kind === 'started' && (
          <p>
            Thanks for downloading Honeymelon. If the download didn&apos;t
            start, use the button above.
          </p>
        )}
        {phase.kind === 'mobile' && (
          <p>
            Honeymelon is a desktop app for Mac, Windows and Linux. Open this
            page on your computer, or pick any package below.
          </p>
        )}
        {phase.kind === 'unknown' && (
          <p>We couldn&apos;t tell which computer you use. Pick it below.</p>
        )}
      </div>
      {isLegacyBuild(release) && (
        <p className="smart-download__legacy">
          Version {release.version} was released as Comet, Honeymelon&apos;s
          former name, and installs as Comet.
        </p>
      )}
      <p className="smart-download__more">
        <a href="#all-downloads">
          Other platforms and versions <ArrowDown aria-hidden="true" />
        </a>
        <a href="/docs/#verify-download">
          Verify your download <ChevronRight aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
