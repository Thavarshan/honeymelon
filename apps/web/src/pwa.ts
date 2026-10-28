import { useCallback, useEffect, useRef, useState } from 'react';

/** Service worker state surfaced to the user; never silently reloads. */
export interface ServiceWorkerState {
  /** True once the app shell is cached and a worker controls the page. */
  offlineReady: boolean;
  /** A newer version installed and waiting for the user's decision. */
  updateReady: boolean;
  /** Activate the waiting version, then reload once it takes control. */
  applyUpdate(): void;
}

/**
 * Register `/sw.js` in production builds. A waiting update activates only
 * after the user chooses to reload, so in-progress conversions keep the
 * worker chunk they started with.
 */
export function useServiceWorker(enabled: boolean): ServiceWorkerState {
  const [offlineReady, setOfflineReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const accepted = useRef(false);
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) {
      return;
    }

    const container = navigator.serviceWorker;
    let disposed = false;
    const controllerChanged = () => {
      if (accepted.current) {
        accepted.current = false;
        location.reload();
      }
    };

    container.addEventListener('controllerchange', controllerChanged);
    container
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        const consider = (worker: ServiceWorker | null) => {
          if (worker?.state === 'installed' && container.controller) {
            if (!disposed) {
              setWaiting(worker);
            }
          }
        };

        consider(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => consider(worker));
        });

        return container.ready;
      })
      .then(() => {
        if (!disposed) {
          setOfflineReady(true);
        }
      })
      .catch(() => {
        /* Offline support is an enhancement; conversion works without it. */
      });

    return () => {
      disposed = true;
      container.removeEventListener('controllerchange', controllerChanged);
    };
  }, [enabled]);
  const applyUpdate = useCallback(() => {
    if (waiting) {
      accepted.current = true;
      waiting.postMessage('skip-waiting');
    }
  }, [waiting]);

  return { offlineReady, updateReady: !!waiting, applyUpdate };
}
