import { devices } from '@playwright/test';
import { createTestConfig } from './src/config.js';

/**
 * Exercise the production build of apps/web, including its CSP, worker chunk
 * and service worker. `HONEYMELON_E2E_APP_URL` targets a deployed preview.
 */
const baseURL = process.env.HONEYMELON_E2E_APP_URL ?? 'http://127.0.0.1:4174';

export default createTestConfig(
  {
    testDir: './tests/web',
    outputDir: './test-results/web',
    ...(process.env.HONEYMELON_E2E_APP_URL
      ? {}
      : {
          webServer: {
            command: 'npm exec -- vite preview',
            cwd: '../../apps/web',
            url: baseURL,
            reuseExistingServer: false,
            timeout: 30000,
          },
        }),
    use: { baseURL, acceptDownloads: true, serviceWorkers: 'block' },
    projects: [
      { name: 'web-chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'web-firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'web-webkit', use: { ...devices['Desktop Safari'] } },
      {
        name: 'web-mobile-chromium',
        use: { ...devices['Pixel 7'] },
        grep: /@mobile/,
      },
    ],
  },
  'web',
);
