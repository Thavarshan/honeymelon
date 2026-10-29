import { useEffect, type ReactElement } from 'react';
import { Archive } from 'lucide-react';
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

  return (
    <div className="web-toolbar">
      {!!finished && (
        <span className="web-retained" aria-live="polite">
          {t('web.retained', { count: finished, size })}
        </span>
      )}
      <Button
        disabled={!finished}
        title={t('web.downloadAllHint')}
        onClick={() => void platform.downloadAll().catch(report)}
      >
        <Archive size={15} />
        {t('web.downloadAll')}
      </Button>
    </div>
  );
}
