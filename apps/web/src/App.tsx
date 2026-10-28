import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConverterProvider,
  ConverterWorkspace,
  type ConverterPreferences,
} from '@honeymelon/converter';
import { Alert, AlertTitle } from '@honeymelon/ui/components/alert';
import { TooltipProvider } from '@honeymelon/ui/components/tooltip';
import { mediaTypes, type Locale, type Theme } from '@honeymelon/contracts';
import type { WebConverterPlatform } from './platform';
import {
  browserStorage,
  loadPreferences,
  savePreferences,
  type WebPreferences,
} from './preferences';
import { useServiceWorker } from './pwa';
import { Settings } from './Settings';
import { WebToolbar } from './WebToolbar';

const downloadsTarget = { id: 'downloads' };
const limitsUrl =
  'https://github.com/Thavarshan/honeymelon/blob/main/docs/web/README.md';

function useTheme(theme: Theme): void {
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && query.matches),
      );
    apply();
    query.addEventListener('change', apply);

    return () => query.removeEventListener('change', apply);
  }, [theme]);
}

/** The browser host: chrome, persistence, theme, language and updates. */
export function App({
  platform,
  serviceWorker = import.meta.env.PROD,
}: {
  platform: WebConverterPlatform;
  serviceWorker?: boolean;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const [preferences, setPreferences] = useState<WebPreferences>(() =>
    loadPreferences(browserStorage(), navigator.language),
  );
  const pwa = useServiceWorker(serviceWorker);
  const [dismissed, setDismissed] = useState(false);
  useTheme(preferences.theme);
  useEffect(() => {
    void i18n.changeLanguage(preferences.locale);
    document.documentElement.lang = preferences.locale;
  }, [i18n, preferences.locale]);
  const update = useCallback((change: Partial<WebPreferences>) => {
    setPreferences((previous) => {
      const next = { ...previous, ...change };
      savePreferences(browserStorage(), next);

      return next;
    });
  }, []);
  const converterPreferences = useMemo<ConverterPreferences>(() => {
    const destination = { target: downloadsTarget, label: t('web.downloads') };

    return {
      locale: preferences.locale,
      media: Object.fromEntries(
        mediaTypes.map((media) => [
          media,
          { ...preferences.media[media], destination },
        ]),
      ) as ConverterPreferences['media'],
    };
  }, [preferences, t]);
  const changeConverter = useCallback(
    async (next: ConverterPreferences) =>
      update({
        locale: next.locale,
        media: Object.fromEntries(
          mediaTypes.map((media) => [
            media,
            { format: next.media[media].format, spec: next.media[media].spec },
          ]),
        ) as WebPreferences['media'],
      }),
    [update],
  );

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={150}>
      <div className="web-shell">
        <header className="web-header">
          <div className="web-brand">
            <img src="/logo.svg" alt="" width="28" height="28" />
            <h1>{t('web.name')}</h1>
            <span className="web-badge">{t('web.beta')}</span>
          </div>
          <p className="web-privacy">{t('web.privacy')}</p>
          <nav className="web-actions" aria-label={t('web.name')}>
            <a
              className="web-link"
              href={__DESKTOP_URL__}
              title={t('web.desktopHint')}
              rel="noopener"
            >
              <Download size={16} />
              <span>{t('web.desktop')}</span>
            </a>
            <Settings
              locale={preferences.locale}
              theme={preferences.theme}
              onChange={(change: { locale?: Locale; theme?: Theme }) =>
                update(change)
              }
            />
          </nav>
        </header>
        {pwa.updateReady && !dismissed && (
          <Alert className="web-update" role="status">
            <RefreshCw size={16} />
            <AlertTitle>{t('web.updateReady')}</AlertTitle>
            <div className="web-update-actions">
              <Button variant="ghost" onClick={() => setDismissed(true)}>
                {t('web.later')}
              </Button>
              <Button variant="primary" onClick={pwa.applyUpdate}>
                {t('web.reload')}
              </Button>
            </div>
          </Alert>
        )}
        <main className="web-main">
          <ConverterProvider
            platform={platform}
            preferences={converterPreferences}
            onPreferencesChange={changeConverter}
          >
            <ConverterWorkspace toolbar={<WebToolbar platform={platform} />} />
          </ConverterProvider>
        </main>
        <footer className="web-footer">
          <p>{t('web.capabilities')}</p>
          <p>
            {pwa.offlineReady && (
              <span className="web-offline">
                <WifiOff size={13} aria-hidden="true" />
                {t('web.offlineReady')}
              </span>
            )}
            <a href={limitsUrl} rel="noopener">
              {t('web.limits')}
            </a>
            <a href="https://github.com/Thavarshan/honeymelon" rel="noopener">
              {t('web.source')}
            </a>
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
}
