// Render PWA icons from the original logo, like generate-brand-assets.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(
  new URL('../../../packages/e2e/package.json', import.meta.url),
);
const { chromium } = require('@playwright/test');
const logo = await readFile(
  new URL('../../../assets/logo.svg', import.meta.url),
  'utf8',
);
const output = new URL('../public/icons/', import.meta.url);
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  // Maskable icons keep the mark inside the central 80% safe zone.
  for (const [name, size, inset, background] of [
    ['icon-192.png', 192, 0, 'transparent'],
    ['icon-512.png', 512, 0, 'transparent'],
    ['apple-touch-icon.png', 180, 0.08, '#fafafa'],
    ['icon-maskable-512.png', 512, 0.12, '#fafafa'],
  ]) {
    const mark = Math.round(size * (1 - inset * 2));
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0;display:grid;place-items:center;width:${size}px;height:${size}px;background:${background}">` +
        logo.replace(
          'width="64" height="64"',
          `width="${mark}" height="${mark}"`,
        ),
    );
    await writeFile(
      new URL(name, output),
      await page.screenshot({ omitBackground: background === 'transparent' }),
    );
  }
} finally {
  await browser.close();
}

console.log('Generated Honeymelon Web PWA icons.');
