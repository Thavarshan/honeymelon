import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import {
  ConverterProvider,
  ConverterWorkspace,
  converterMessages,
  type ConverterPlatform,
  type ConverterPreferences,
} from '@honeymelon/converter';
import { UnsupportedConversionService } from '@honeymelon/browser-engine';
import './style.css';

const i18n = createInstance();
await i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  initAsync: false,
  interpolation: { escapeValue: false },
  resources: Object.fromEntries(
    Object.entries(converterMessages).map(([locale, translation]) => [
      locale,
      { translation },
    ]),
  ),
});
const service = new UnsupportedConversionService();
const platform: ConverterPlatform = {
  service,
  mediaTypes: ['image'],
  intake: (files) =>
    files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      sizeBytes: file.size,
    })),
  removeItem: () => service.getSnapshot(),
  clearMedia: () => service.getSnapshot(),
};

/** Mount the real shared UI over the explicitly unsupported browser stub. */
function Harness() {
  const destination = { target: { id: 'downloads' }, label: 'Downloads' };
  const [preferences, setPreferences] = useState<ConverterPreferences>({
    locale: 'en',
    media: {
      image: { format: 'jpg', destination },
      audio: { format: 'mp3', destination },
      video: { format: 'mp4', destination },
    },
  });

  return (
    <I18nextProvider i18n={i18n}>
      <ConverterProvider
        platform={platform}
        preferences={preferences}
        onPreferencesChange={async (next) => {
          setPreferences(next);
        }}
      >
        <ConverterWorkspace />
      </ConverterProvider>
    </I18nextProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
