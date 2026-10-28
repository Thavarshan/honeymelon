import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const releases = 'https://github.com/Thavarshan/honeymelon/releases/download';
const agents = {
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  ubuntu:
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

/**
 * Answer GitHub release downloads like GitHub does (an attachment, so the page
 * stays put) and record them. No test ever fetches a real package.
 */
async function interceptDownloads(context: BrowserContext): Promise<string[]> {
  const started: string[] = [];
  await context.route('https://github.com/**', async (route) => {
    started.push(route.request().url());
    await route.fulfill({
      status: 200,
      body: '',
      headers: { 'content-disposition': 'attachment; filename=package' },
    });
  });

  return started;
}

test.beforeEach(async ({ context }) => {
  await interceptDownloads(context);
});

/**
 * A visitor with a given user agent and the processor clues a real browser
 * would expose: client hints (Chromium) or a WebGL renderer (Safari, Firefox).
 */
async function visitor(
  browser: Browser,
  userAgent: string,
  clues: { architecture?: string; gpu?: string; width?: number } = {},
): Promise<{ page: Page; started: string[]; context: BrowserContext }> {
  const context = await browser.newContext({
    userAgent,
    viewport: { width: clues.width ?? 1280, height: 900 },
    baseURL: test.info().project.use.baseURL ?? '',
  });
  const started = await interceptDownloads(context);
  await context.addInitScript((hints) => {
    Object.defineProperty(Navigator.prototype, 'userAgentData', {
      configurable: true,
      get: () =>
        hints.architecture
          ? {
              platform: '',
              getHighEntropyValues: async () => ({
                architecture: hints.architecture,
                bitness: '64',
              }),
            }
          : undefined,
    });
    HTMLCanvasElement.prototype.getContext = (() =>
      hints.gpu
        ? {
            RENDERER: 7937,
            getExtension: () => null,
            getParameter: () => hints.gpu,
          }
        : null) as unknown as HTMLCanvasElement['getContext'];
  }, clues);

  return { page: await context.newPage(), started, context };
}

/**
 * Test an exported marketing site with the same browser real people use.
 *
 * Source-only tests cannot find a clipped mobile layout, inaccessible focus
 * target, or broken animation control. These tests cover those gaps while
 * making no claim that human visual review is unnecessary.
 */
test('site navigates from home to official desktop downloads', async ({
  page,
}) => {
  const forbiddenRequests: string[] = [];

  page.on('request', (request) => {
    if (
      !['GET', 'HEAD'].includes(request.method()) ||
      request.url().startsWith('https://api.github.com/')
    ) {
      forbiddenRequests.push(request.method() + ' ' + request.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Made simple.',
  );
  await page
    .locator('.hero')
    .getByRole('link', { name: /^Download/ })
    .click();
  await expect(page).toHaveURL('/download/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Download Honeymelon',
  );

  const release = page.getByRole('link', { name: 'All releases on GitHub' });
  await expect(release).toHaveAttribute(
    'href',
    'https://github.com/Thavarshan/honeymelon/releases',
  );

  expect(forbiddenRequests).toEqual([]);
});

test('the exported pages fit narrow screens without sideways scrolling', async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 820 });

    for (const route of [
      '/',
      '/download/',
      '/features/',
      '/docs/',
      '/privacy/',
      '/releases/',
      '/license/',
    ]) {
      await page.goto(route);

      const fitsViewport = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );

      expect(
        fitsViewport,
        route + ' caused horizontal overflow at width ' + width,
      ).toBe(true);
    }
  }
});

test('motion can be paused and the browser accessibility setting is honored', async ({
  page,
}) => {
  await page.goto('/');
  const hero = page.locator('.hero-copy');
  const pause = page.getByRole('button', {
    name: 'Pause motion',
  });

  await pause.click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-paused',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Resume motion' }),
  ).toHaveAttribute('aria-pressed', 'true');

  const playState = await hero.evaluate(
    (element) => getComputedStyle(element).animationPlayState,
  );
  expect(playState).toBe('paused');

  await page.getByRole('button', { name: 'Resume motion' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-paused',
    'false',
  );

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedDuration = await hero.evaluate(
    (element) => getComputedStyle(element).animationDuration,
  );

  expect(parseFloat(reducedDuration)).toBeLessThan(0.01);
});

test('product guidance is navigable and honest about browser availability', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Features', exact: true })
    .click();
  await expect(page).toHaveURL('/features/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('no live browser converter yet')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Docs', exact: true })
    .click();
  await expect(page).toHaveURL('/docs/');
  await expect(
    page.getByRole('heading', { name: 'Getting started with Honeymelon' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL('/privacy/');
  await expect(
    page.getByRole('heading', { name: 'Privacy and limitations' }),
  ).toBeVisible();
});

test('keyboard users can reach the skip link on a content page', async ({
  page,
}) => {
  await page.goto('/privacy/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.locator('main')).toBeFocused();
});

/**
 * Audit real exported markup and contrast at desktop and phone sizes.
 */
for (const width of [390, 1280]) {
  test(
    'public routes pass WCAG A/AA checks at width ' + width,
    async ({ page }, testInfo) => {
      const failures: {
        route: string;
        violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'];
      }[] = [];

      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        '/',
        '/download/',
        '/features/',
        '/docs/',
        '/privacy/',
        '/releases/',
        '/license/',
      ]) {
        await page.goto(route);
        // Exercise native lazy loading before saving a complete page image.
        for (const image of await page.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await expect(image).toHaveJSProperty('complete', true);
          expect(
            await image.evaluate(
              (element) => (element as HTMLImageElement).naturalWidth,
            ),
          ).toBeGreaterThan(0);
        }

        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: 'instant' }),
        );

        const audit = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const label = route === '/' ? 'home' : route.replaceAll('/', '');

        await testInfo.attach(label + '-axe.json', {
          body: JSON.stringify(audit, null, 2),
          contentType: 'application/json',
        });
        await testInfo.attach(label + '.png', {
          body: await page.screenshot({
            fullPage: true,
            animations: 'disabled',
          }),
          contentType: 'image/png',
        });
        if (audit.violations.length > 0) {
          failures.push({ route, violations: audit.violations });
        }
      }

      expect(failures, 'Accessibility violations across public routes').toEqual(
        [],
      );
    },
  );
}

/** Search crawlers and visitors must see complete, unique static content. */
test('all routes have metadata, intact local links and reserved image space', async ({
  page,
}) => {
  const titles = new Set<string>();
  for (const route of [
    '/',
    '/download/',
    '/features/',
    '/docs/',
    '/privacy/',
    '/releases/',
    '/license/',
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const title = await page.title();
    expect(titles.has(title), 'Duplicate title on ' + route).toBe(false);
    titles.add(title);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /\S.{30,}/);
    const localLinks = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => Boolean(href)),
      );
    for (const href of new Set(localLinks)) {
      const target = await page.request.get(href.split('#')[0] || '/');
      expect(target.status(), 'Broken link ' + href + ' on ' + route).toBe(200);
    }

    for (const image of await page.locator('img').all()) {
      await expect(image).toHaveAttribute('alt');
      expect(Number(await image.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(await image.getAttribute('height'))).toBeGreaterThan(0);
    }
  }
});

/**
 * Reading and download navigation remain available without JavaScript.
 */
test('essential content works without JavaScript', async ({
  browser,
  baseURL,
}) => {
  if (!baseURL) {
    throw new Error('The site test configuration must provide a baseURL.');
  }

  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('link', { name: 'Docs', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Getting started with Honeymelon' }),
    ).toBeVisible();
    await expect(
      page.getByText('shasum -a 256 PACKAGE', { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

/** Record repeatable lab paint/layout metrics without adding site telemetry. */
test('mobile first paint and layout stay within lab budgets', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const state = { lcp: 0, cls: 0 };
    const host = window as Window & { honeymelonLabVitals?: typeof state };

    host.honeymelonLabVitals = state;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.lcp = entry.startTime;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };

        if (!shift.hadRecentInput) {
          state.cls += shift.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const results = [];

  for (const route of ['/', '/features/']) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const host = window as Window & {
        honeymelonLabVitals?: { lcp: number; cls: number };
      };

      return (host.honeymelonLabVitals?.lcp ?? 0) > 0;
    });
    const metrics = await page.evaluate(() => {
      const host = window as Window & {
        honeymelonLabVitals?: { lcp: number; cls: number };
      };

      return host.honeymelonLabVitals;
    });

    expect(metrics, 'Missing lab metrics for ' + route).toBeDefined();
    expect(metrics?.lcp, route + ' LCP in milliseconds').toBeLessThan(5000);
    expect(metrics?.cls, route + ' layout shift').toBeLessThanOrEqual(0.1);
    results.push({ route, ...metrics });
  }

  await testInfo.attach('mobile-lab-vitals.json', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
});

test('a Windows PC gets the matching installer automatically, once', async ({
  browser,
}) => {
  const { page, started, context } = await visitor(browser, agents.windows);
  try {
    await page.goto('/download/');
    await expect(page.locator('.smart-download__version')).toHaveText(
      'Honeymelon 2.2.3 for Windows',
    );
    await expect(page.getByText(/Your download will begin in/)).toBeVisible();
    await expect
      .poll(() => started, { timeout: 8000 })
      .toEqual([`${releases}/v2.2.3/comet-2.2.3-x64-setup.exe`]);
    await expect(page.getByText('Thanks for downloading')).toBeVisible();
    await expect(page).toHaveURL('/download/');

    // Reloading the tab never downloads the same file again.
    await page.reload();
    await expect(
      page
        .locator('.smart-download')
        .getByRole('link', { name: /^Download Honeymelon 2\.2\.3/ }),
    ).toBeVisible();
    await expect(page.getByText(/Your download will begin/)).toHaveCount(0);
    await page.waitForTimeout(4000);
    expect(started).toHaveLength(1);
  } finally {
    await context.close();
  }
});

test('processor clues pick ARM and Apple silicon builds; Cancel stops the download', async ({
  browser,
}) => {
  for (const [agent, clues, expected] of [
    [
      agents.windows,
      { architecture: 'arm' },
      'v2.2.3/comet-2.2.3-arm64-setup.exe',
    ],
    [
      agents.mac,
      { gpu: 'ANGLE (Apple, Apple M2, OpenGL 4.1)' },
      'v2.2.3/Comet-darwin-arm64-2.2.3.zip',
    ],
    [
      agents.mac,
      { gpu: 'Intel(R) Iris(TM) Plus Graphics' },
      'v2.2.3/Comet-darwin-x64-2.2.3.zip',
    ],
    [agents.ubuntu, {}, 'v2.2.3/comet_2.2.3_amd64.deb'],
  ] as const) {
    const { page, started, context } = await visitor(browser, agent, clues);
    try {
      await page.goto('/download/');
      const button = page
        .locator('.smart-download')
        .getByRole('link', { name: /^Download Honeymelon 2.2.3 for/ });
      await expect(button).toHaveAttribute('href', `${releases}/${expected}`);
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(3500);
      expect(started, expected).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test('when the browser cannot tell, visitors choose with one click instead of a guess', async ({
  browser,
}) => {
  const mac = await visitor(browser, agents.mac);
  try {
    await mac.page.goto('/download/');
    await expect(
      mac.page.getByText('Which chip does your Mac have?'),
    ).toBeVisible();
    const choices = mac.page.locator('.smart-download__choices a');
    await expect(choices).toHaveText([/^Apple silicon/, /^Intel/]);
    await expect(choices.first()).toHaveAttribute(
      'href',
      `${releases}/v2.2.3/Comet-darwin-arm64-2.2.3.zip`,
    );
    await expect(choices.last()).toHaveAttribute(
      'href',
      `${releases}/v2.2.3/Comet-darwin-x64-2.2.3.zip`,
    );
    await mac.page.waitForTimeout(4000);
    expect(mac.started).toEqual([]);
    await choices.first().click();
    await expect
      .poll(() => mac.started)
      .toEqual([`${releases}/v2.2.3/Comet-darwin-arm64-2.2.3.zip`]);
  } finally {
    await mac.context.close();
  }

  const linux = await visitor(browser, agents.linux);
  try {
    await linux.page.goto('/download/');
    await expect(
      linux.page.getByText('Which package suits your system?'),
    ).toBeVisible();
    await expect(linux.page.locator('.smart-download__choices a')).toHaveText([
      /Debian, Ubuntu/,
      /Fedora, openSUSE/,
    ]);
  } finally {
    await linux.context.close();
  }
});

test('phones, deep links and ?auto=0 never start a download', async ({
  browser,
}) => {
  const phone = await visitor(browser, agents.iphone, { width: 390 });
  try {
    await phone.page.goto('/download/');
    await expect(
      phone.page.getByText('Honeymelon is a desktop app for Mac'),
    ).toBeVisible();
    await phone.page.waitForTimeout(4000);
    expect(phone.started).toEqual([]);
  } finally {
    await phone.context.close();
  }

  for (const route of ['/download/?auto=0', '/download/#all-downloads']) {
    const pc = await visitor(browser, agents.windows);
    try {
      await pc.page.goto(route);
      await expect(
        pc.page
          .locator('.smart-download')
          .getByRole('link', { name: /^Download Honeymelon 2\.2\.3/ }),
      ).toBeVisible();
      await pc.page.waitForTimeout(4000);
      expect(pc.started, route).toEqual([]);
    } finally {
      await pc.context.close();
    }
  }
});

test('every version and platform is one click away, with no forms', async ({
  page,
}) => {
  await page.goto('/download/?auto=0');
  await expect(page.locator('main select, main input, main form')).toHaveCount(
    0,
  );

  const stable = page.locator('#all-downloads');
  for (const name of ['Mac', 'Windows', 'Linux']) {
    await expect(
      stable.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  }

  await expect(stable.locator('a.package-row')).toHaveCount(8);
  await expect(page.locator('#beta a.package-row')).toHaveCount(12);
  for (const link of await page.locator('a.package-row').all()) {
    expect(await link.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/Thavarshan\/honeymelon\/releases\/download\/v[^/]+\/[^/]+$/,
    );
  }

  // Older versions expand with the keyboard.
  const older = page.locator('[id="v2.2.2"]');
  await older.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(
    older.getByRole('link', { name: /x64\s*Installer/ }),
  ).toHaveAttribute('href', `${releases}/v2.2.2/comet-2.2.2-x64-setup.exe`);
});

test('release history links each version to its downloads', async ({
  page,
}) => {
  await page.goto('/releases/');
  await expect(
    page.getByRole('heading', { name: 'v2.2.3', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'v3.0.0-beta.1', exact: true }),
  ).toBeVisible();
  await page
    .locator('.timeline__entry', {
      has: page.getByRole('heading', { name: 'v2.2.2', exact: true }),
    })
    .getByRole('link', { name: /^Downloads/ })
    .click();
  await expect(page).toHaveURL('/download/#v2.2.2');
  await expect(page.locator('[id="v2.2.2"]')).toHaveAttribute('open', '');
});

test('mobile navigation traps focus, closes with Escape and follows links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open menu' });

  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Honeymelon', exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'Docs', exact: true }).click();
  await expect(page).toHaveURL('/docs/');
  await expect(
    page.getByRole('heading', { name: 'Getting started with Honeymelon' }),
  ).toBeVisible();
});

test('FAQ remains keyboard operable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    await page.goto('/');
    const question = page
      .locator('summary')
      .filter({ hasText: 'Is Honeymelon really free?' });
    await question.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('There are no subscription fees', { exact: false }),
    ).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('There are no subscription fees', { exact: false }),
    ).not.toBeVisible();
  } finally {
    await context.close();
  }
});
