import type { ReactElement } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, useConverter } from '@honeymelon/converter';
import type { MediaType } from '@honeymelon/contracts';
import type { WebConverterPlatform } from './platform';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@honeymelon/ui/components/dialog';

const matrixUrl =
  'https://github.com/Thavarshan/honeymelon/blob/main/docs/web/capability-matrix.md';

/** Explain actual encoder availability before users import expensive media. */
export function WebCapabilityGuide({
  platform,
}: {
  platform: WebConverterPlatform;
}): ReactElement {
  const { t } = useTranslation();
  const { capabilities } = useConverter();
  const types: MediaType[] = ['image', 'audio', 'video'];
  const limits = platform.service.resourceLimits;
  const mib = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MiB`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Info size={15} />
          {t('web.guideTitle')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="web-capability-guide"
        closeLabel={t('ui.dismiss')}
      >
        <DialogTitle>{t('web.guideTitle')}</DialogTitle>
        <DialogDescription>{t('web.guideDescription')}</DialogDescription>
        <div className="web-guide-formats">
          {types.map((media) => {
            const supported = (capabilities?.[media] ?? []).filter(
              (format) => format.available,
            );

            return (
              <section key={media} aria-label={t(`media.${media}`)}>
                <h3>{t(`media.${media}`)}</h3>
                <p>
                  {t('web.guideAvailable')}:{' '}
                  {supported.length
                    ? supported
                        .map((format) => {
                          const label = format.format.toUpperCase();
                          const codecs = format.codecs?.join(', ');

                          return codecs ? `${label} (${codecs})` : label;
                        })
                        .join(', ')
                    : t('web.guideNone')}
                </p>
                {media === 'video' && !!supported.length && (
                  <p>{t('web.guideCodecs')}</p>
                )}
              </section>
            );
          })}
        </div>
        <p>
          {t('web.guideBrowserLimits', {
            image: mib(limits.inputBytes.image),
            audio: mib(limits.inputBytes.audio),
            video: mib(limits.inputBytes.video),
            minutes: limits.videoSeconds / 60,
            retained: mib(limits.retainedBytes),
          })}
        </p>
        <p>{t('web.guideAudioLimits')}</p>
        <p>{t('web.guideLargeFiles')}</p>
        <div className="web-guide-links">
          <a href={__DESKTOP_URL__} rel="noopener">
            {t('web.desktop')}
          </a>
          <a href={matrixUrl} rel="noopener">
            {t('web.guideMatrix')}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
