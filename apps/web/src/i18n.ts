import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { converterMessages } from '@honeymelon/converter';
import { locales } from '@honeymelon/contracts';
import web from './messages.json';

/** Shared converter strings plus the web host's own `web.*` strings. */
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    locales.map((locale) => [
      locale,
      { translation: { ...converterMessages[locale], web: web[locale] } },
    ]),
  ),
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: [...locales],
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18n;
