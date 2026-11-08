import '@testing-library/jest-dom/vitest';
import { StrictMode, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import type { Capabilities, Locale } from '@honeymelon/contracts';
import type { ConversionQueue, ConversionService } from '@honeymelon/core';
import {
  ConverterProvider,
  ConverterWorkspace,
  converterMessages,
  converterReducer,
  initialConverterState,
  useConverter,
  type ConverterPlatform,
  type ConverterPreferences,
} from './index';

const capabilities: Capabilities = {
  image: [{ format: 'jpg', available: true }],
  audio: [],
  video: [],
};
const destination = { target: { id: 'downloads' }, label: 'Downloads' };

function RevisionProbe() {
  const { queue } = useConverter();

  return <output aria-label="Snapshot revision">{queue.revision}</output>;
}

function browserHost() {
  let queue: ConversionQueue = { revision: 0, batches: [], jobs: [] };
  const listeners = new Set<(queue: ConversionQueue) => void>();
  const publish = (next: ConversionQueue) => {
    queue = next;
    listeners.forEach((listener) => listener(queue));
  };

  const service: ConversionService = {
    discoverCapabilities: vi.fn(async () => capabilities),
    probe: vi.fn(async () => ({
      duration: null,
      width: 8,
      height: 8,
      videoCodec: null,
      frames: 1,
      audio: [],
    })),
    getSnapshot: vi.fn(async () => queue),
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    enqueue: vi.fn(async (request) => {
      publish({
        revision: queue.revision + 1,
        batches: [
          { id: 'batch', mediaType: request.mediaType, jobIds: ['job'] },
        ],
        jobs: request.files.map((file) => ({
          id: 'job',
          batchId: 'batch',
          itemId: file.id,
          name: file.name,
          sizeBytes: file.sizeBytes,
          mediaType: request.mediaType,
          outputFormat: request.outputFormat,
          target: request.target,
          spec: request.spec,
          state: 'running',
          progress: 25,
        })),
      });

      return queue;
    }),
    cancelJob: vi.fn(async () => ({ status: 'canceled' })),
    cancelBatch: vi.fn(async () => ({ status: 'canceled' })),
    dispose: vi.fn(async () => {}),
  };
  const platform: ConverterPlatform = {
    service,
    mediaTypes: ['image'],
    intake: (files) =>
      files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        sizeBytes: file.size,
      })),
    removeItem: vi.fn(async () => queue),
    clearMedia: vi.fn(async () => queue),
  };

  return { platform, service, listeners, publish, snapshot: () => queue };
}

async function mount(
  host: ReturnType<typeof browserHost>,
  locale: Locale = 'en',
) {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false },
    resources: Object.fromEntries(
      Object.entries(converterMessages).map(([language, translation]) => [
        language,
        { translation },
      ]),
    ),
  });

  function Harness() {
    const [preferences, setPreferences] = useState<ConverterPreferences>({
      locale,
      media: {
        image: { format: 'jpg', destination },
        video: { format: 'mp4', destination },
        audio: { format: 'mp3', destination },
      },
    });

    return (
      <I18nextProvider i18n={i18n}>
        <ConverterProvider
          platform={host.platform}
          preferences={preferences}
          onPreferencesChange={async (next) => {
            setPreferences(next);
          }}
        >
          <ConverterWorkspace />
          <RevisionProbe />
        </ConverterProvider>
      </I18nextProvider>
    );
  }

  return {
    view: render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    ),
    i18n,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}

      unobserve() {}

      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('mounts the actual converter without Electron and hides native-only actions', async () => {
  expect(window).not.toHaveProperty('honeymelon');
  const host = browserHost();
  const { view } = await mount(host);
  await screen.findByRole('tab', { name: 'Image' });
  expect(screen.getAllByRole('tab')).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Save to' }),
  ).not.toBeInTheDocument();
  expect(host.listeners.size).toBe(1);
  const input = within(screen.getByRole('tabpanel')).getByLabelText(
    'Add files',
  );
  fireEvent.change(input, {
    target: { files: [new File(['image'], 'PHOTO.PNG')] },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Convert' }));
  expect(host.service.enqueue).toHaveBeenCalledWith({
    mediaType: 'image',
    files: [{ id: expect.any(String), name: 'PHOTO.PNG', sizeBytes: 5 }],
    target: { id: 'downloads' },
    outputFormat: 'jpg',
    spec: expect.objectContaining({ kind: 'image' }),
  });
  expect(screen.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '25',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cancel batch' }));
  expect(host.service.cancelBatch).toHaveBeenCalledWith('batch');
  await act(async () =>
    host.publish({
      ...host.snapshot(),
      revision: 2,
      jobs: host
        .snapshot()
        .jobs.map((job) => ({ ...job, state: 'succeeded', progress: 100 })),
    }),
  );
  expect(
    screen.queryByRole('button', { name: /Show in folder/ }),
  ).not.toBeInTheDocument();
  const download = vi.fn(async () => {});
  host.platform.outputAction = {
    kind: 'download',
    label: () => 'Download',
    run: download,
  };
  await act(async () => host.publish({ ...host.snapshot(), revision: 3 }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Download: PHOTO.PNG' }),
  );
  expect(download).toHaveBeenCalledWith('job');
  view.unmount();
  expect(host.listeners.size).toBe(0);
  expect(host.service.dispose).not.toHaveBeenCalled();
  expect(vi.mocked(host.service.probe).mock.lastCall?.[1]?.aborted).toBe(true);
}, 15_000);

it('keeps newer progress when a stale initial snapshot resolves later', async () => {
  const host = browserHost();
  const stale = host.snapshot();
  vi.mocked(host.service.getSnapshot).mockImplementation(async () => {
    host.publish({ ...stale, revision: 10 });

    return stale;
  });
  await mount(host);
  await screen.findByRole('tab', { name: 'Image' });
  expect(screen.getByLabelText('Snapshot revision')).toHaveTextContent('10');
  const newest = converterReducer(initialConverterState, {
    type: 'queue',
    queue: { ...stale, revision: 10 },
  });
  expect(converterReducer(newest, { type: 'queue', queue: stale })).toBe(
    newest,
  );
});

it('offers initialization recovery through the injected service', async () => {
  const host = browserHost();
  vi.mocked(host.service.discoverCapabilities).mockRejectedValue(
    new Error('offline'),
  );
  await mount(host);
  await screen.findByRole('heading', {
    name: 'Honeymelon could not get ready',
  });
  vi.mocked(host.service.discoverCapabilities).mockResolvedValue(capabilities);
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('tab', { name: 'Image' });
  expect(host.listeners.size).toBe(1);
});

it('retains all five locales in a standalone host', async () => {
  for (const locale of ['en', 'es', 'fr', 'de', 'ru'] as const) {
    const { view, i18n } = await mount(browserHost(), locale);
    expect(
      await screen.findByRole('tab', { name: i18n.t('media.image') }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: i18n.t('upload.title', {
          type: i18n.t('media.image').toLowerCase(),
        }),
      }),
    ).toBeVisible();
    view.unmount();
  }
});
