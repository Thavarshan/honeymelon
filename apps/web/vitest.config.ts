import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.cache/vite',
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __DESKTOP_URL__: JSON.stringify('https://example.test/download/'),
  },
  test: {
    fsModuleCachePath: '.cache/vitest-unit',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
