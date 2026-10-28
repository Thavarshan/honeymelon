import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { App } from './App';
import { WebConverterPlatform } from './platform';
import './style.css';

// One platform per page load: React Strict Mode must not dispose live jobs.
const platform = new WebConverterPlatform();
addEventListener('pagehide', (event) => {
  if (!event.persisted) {
    void platform.service.dispose().catch(() => {});
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App platform={platform} />
    </I18nextProvider>
  </StrictMode>,
);
