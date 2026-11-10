import { useEffect, useSyncExternalStore, type ReactElement } from 'react';
import { Archive, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isTerminal } from '@honeymelon/contracts';
import { Button, useConverter } from '@honeymelon/converter';
import type { WebConverterPlatform } from './platform';

/**
 * Batch export and tab-lifetime safeguards. Rendered inside the converter so
 * it follows the same revisioned queue as the shared workspace.
 */
export function WebToolbar({
  platform,
}: {
  platform: WebConverterPlatform;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { queue, report } = useConverter();
  const download = useSyncExternalStore(
    platform.subscribe,
    platform.downloadStatus,
  );
  const finished = queue.jobs.filter(
    (job) => job.state === 'succeeded' && platform.service.output(job.id),
  ).length;
  const active = queue.jobs.some((job) => !isTerminal(job.state));
  useEffect(() => {
    // Closing the tab discards selected files, running jobs and outputs.
    const guard = (event: BeforeUnloadEvent) => {
      if (active || platform.unsaved()) {
        event.preventDefault();
      }
    };

    window.addEventListener('beforeunload', guard);

    return () => window.removeEventListener('beforeunload', guard);
  }, [active, platform]);
  const size = new Intl.NumberFormat(i18n.language, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1,
  }).format(platform.service.retainedBytes() / 1e6);

  const preparing = download.phase === 'preparing';

  return (
    <div className="web-toolbar">
      {!!finished && (
        <span className="web-retained" aria-live="polite">
          {t('web.retained', { count: finished, size })}
        </span>
      )}
      <Button
        disabled={!finished || preparing}
        title={t('web.downloadAllHint')}
        onClick={() =>
          void platform.downloadAll().catch((error: unknown) => {
            if (
              !(error instanceof DOMException && error.name === 'AbortError')
            ) {
              report(error);
            }
          })
        }
      >
        <Archive size={15} />
        {t('web.downloadAll')}
      </Button>
      {preparing && (
        <>
          <span role="status" className="web-export-progress">
            {t('web.zipPreparing', { percent: download.percent })}
          </span>
          <Button onClick={() => platform.cancelZipExport()}>
            <X size={15} />
            {t('web.cancelExport')}
          </Button>
        </>
      )}
      {download.awaitingConfirmation > 0 && (
        <div className="web-confirmation" role="status">
          <span>{t('web.downloadUnverified')}</span>
          <Button onClick={() => platform.confirmRequestedDownloads()}>
            <Check size={15} />
            {t('web.confirmSaved')}
          </Button>
        </div>
      )}
    </div>
  );
}
