import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { unzipSync } from 'fflate';
import {
  BrowserConversionService,
  type MediaRuntime,
} from '@honeymelon/browser-engine';
import { App } from './App';
import i18n from './i18n';
import { maxZipBytes, WebConverterPlatform } from './platform';
import { preferencesKey } from './preferences';

/** Answers like the real worker, without a canvas. */
class InstantWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;

  onerror = null;

  onmessageerror = null;

  postMessage(request: { type: string; mime?: string }) {
    queueMicrotask(() =>
      this.onmessage?.({
        data:
          request.type === 'capabilities'
            ? {
                type: 'capabilities',
                offscreen: true,
                encoders: ['image/png', 'image/jpeg'],
              }
            : {
                type: 'result',
                blob: new Blob(['converted'], { type: request.mime ?? '' }),
              },
      }),
    );
  }

  terminate() {}
}

const runtime = { audioDecode: false, videoFrames: false } as MediaRuntime;
const png = () =>
  new File(
    [
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68,
        82, 0, 0, 0, 4, 0, 0, 0, 3,
      ]),
    ],
    'photo.png',
    { type: 'image/png' },
  );

let saved: { name: string; blob: Blob }[] = [];

function mount() {
  const platform = new WebConverterPlatform(
    new BrowserConversionService({
      createWorker: () => new InstantWorker() as unknown as Worker,
      runtime,
    }),
  );
  render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App platform={platform} serviceWorker={false} />
      </I18nextProvider>
    </StrictMode>,
  );

  return platform;
}

beforeEach(() => {
  saved = [];
  localStorage.clear();
  // Radix primitives use layout and pointer APIs that jsdom lacks.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}

      unobserve() {}

      disconnect() {}
    },
  );
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  let blob: Blob | undefined;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
    blob = value as Blob;

    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ name: this.download, blob: blob! });
  });
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

it('converts locally, downloads by name, zips all and guards tab close', async () => {
  const user = userEvent.setup();
  const platform = mount();
  const image = await screen.findByRole('region', { name: 'Image' });
  await user.upload(
    within(image).getByLabelText('Add files', { selector: 'input' }),
    [png(), png()],
  );
  await user.click(within(image).getByRole('button', { name: /^Convert/ }));
  await waitFor(() =>
    expect(within(image).getAllByText('Complete')).toHaveLength(2),
  );
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);

  const [first] = within(image).getAllByRole('button', {
    name: 'Download: photo.png',
  });
  await user.click(first!);
  expect(saved.at(-1)?.name).toBe('photo.jpg');
  await user.click(screen.getByRole('button', { name: 'Download all' }));
  await waitFor(() => expect(saved).toHaveLength(2));
  const archive = saved.at(-1)!;
  expect(archive.name).toMatch(/^honeymelon-\d{14}\.zip$/);
  expect(
    Object.keys(
      unzipSync(new Uint8Array(await archive.blob.arrayBuffer())),
    ).sort(),
  ).toEqual(['README.txt', 'photo (2).jpg', 'photo.jpg']);
  // A download request cannot confirm disk persistence.
  expect(platform.unsaved()).toBe(2);
  const after = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(after);
  expect(after.defaultPrevented).toBe(true);
  expect(screen.getByText(/browser cannot confirm it was saved/)).toBeVisible();
  await user.click(
    screen.getByRole('button', { name: "I've saved these files" }),
  );
  expect(platform.unsaved()).toBe(0);
  const confirmed = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(confirmed);
  expect(confirmed.defaultPrevented).toBe(false);
});

it('keeps outputs protected until every requested file is confirmed', async () => {
  const user = userEvent.setup();
  const platform = mount();
  const image = await screen.findByRole('region', { name: 'Image' });
  await user.upload(
    within(image).getByLabelText('Add files', { selector: 'input' }),
    [png(), png()],
  );
  await user.click(within(image).getByRole('button', { name: /^Convert/ }));
  await waitFor(() =>
    expect(within(image).getAllByText('Complete')).toHaveLength(2),
  );
  const [first] = within(image).getAllByRole('button', {
    name: 'Download: photo.png',
  });
  await user.click(first!);
  await user.click(
    screen.getByRole('button', { name: "I've saved these files" }),
  );
  expect(platform.unsaved()).toBe(1);
  const after = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(after);
  expect(after.defaultPrevented).toBe(true);
});

it('does not claim a blocked download was saved', async () => {
  const platform = mount();
  const blob = new Blob(['output']);
  vi.spyOn(platform.service, 'output').mockReturnValue({
    name: 'photo.jpg',
    blob,
  });
  vi.spyOn(platform.service, 'outputs').mockReturnValue([
    ['job', { name: 'photo.jpg', blob }],
  ]);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
    throw new Error('Download blocked');
  });
  expect(() => platform.download('job')).toThrow('Download blocked');
  expect(platform.downloadStatus().awaitingConfirmation).toBe(0);
  expect(platform.unsaved()).toBe(1);
});

it('rejects oversized ZIP batches before reading any output', async () => {
  const platform = mount();
  const blob = new Blob(['output']);
  Object.defineProperty(blob, 'size', { value: maxZipBytes + 1 });
  vi.spyOn(blob, 'slice');
  vi.spyOn(platform.service, 'outputs').mockReturnValue([
    ['job', { name: 'large.mp4', blob }],
  ]);
  await expect(platform.downloadAll()).rejects.toThrow('64 MiB');
  expect(blob.slice).not.toHaveBeenCalled();
  expect(platform.downloadStatus().phase).toBe('idle');
  expect(platform.unsaved()).toBe(1);
});

it('cancels ZIP preparation without making a download request', async () => {
  const platform = mount();
  const blob = new Blob([new Uint8Array(5 * 1024 * 1024)]);
  vi.spyOn(platform.service, 'outputs').mockReturnValue([
    ['job', { name: 'photo.jpg', blob }],
  ]);
  platform.subscribe(() => {
    if (
      platform.downloadStatus().phase === 'preparing' &&
      platform.downloadStatus().percent > 0
    ) {
      platform.cancelZipExport();
    }
  });
  const pending = platform.downloadAll();
  expect(platform.downloadStatus().phase).toBe('preparing');
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(saved).toHaveLength(0);
  expect(platform.downloadStatus().phase).toBe('idle');
  expect(platform.unsaved()).toBe(1);
});

it('applies stored language and theme, and persists settings changes', async () => {
  localStorage.setItem(
    preferencesKey,
    JSON.stringify({ locale: 'de', theme: 'light' }),
  );
  const user = userEvent.setup();
  mount();
  expect(
    await screen.findByText(
      'Dateien werden in diesem Tab konvertiert und nie hochgeladen.',
    ),
  ).toBeInTheDocument();
  expect(document.documentElement.lang).toBe('de');
  expect(document.documentElement).not.toHaveClass('dark');
  await user.click(screen.getByRole('button', { name: 'Einstellungen' }));
  await user.click(screen.getByRole('combobox', { name: 'Darstellung' }));
  await user.click(await screen.findByRole('option', { name: 'Dunkel' }));
  await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  expect(JSON.parse(localStorage.getItem(preferencesKey)!)).toMatchObject({
    locale: 'de',
    theme: 'dark',
  });
});

it('shows why video conversion is unavailable instead of offering it', async () => {
  mount();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('tab', { name: 'Video' }));
  const video = screen.getByRole('region', { name: 'Video' });
  expect(
    within(video).getByRole('button', { name: /^Convert/ }),
  ).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Get Desktop' })).toHaveAttribute(
    'href',
    'https://example.test/download/',
  );
});
