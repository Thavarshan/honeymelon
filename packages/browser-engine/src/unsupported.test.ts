import { expect, it, vi } from 'vitest';
import type { ConversionService } from '@honeymelon/core';
import { UnsupportedConversionService } from './unsupported';

it('negotiates unavailable capabilities and never creates phantom jobs', async () => {
  const service: ConversionService = new UnsupportedConversionService();
  const listener = vi.fn();
  const unsubscribe = service.subscribe(listener);
  const capabilities = await service.discoverCapabilities();
  expect(
    Object.values(capabilities)
      .flat()
      .every((item) => !item.available),
  ).toBe(true);
  await expect(
    service.enqueue({
      mediaType: 'image',
      files: [{ id: 'file', name: 'photo.png', sizeBytes: 100 }],
      target: { id: 'downloads' },
      outputFormat: 'jpg',
    }),
  ).rejects.toMatchObject({ code: 'unsupported' });
  expect(await service.getSnapshot()).toEqual({
    revision: 0,
    batches: [],
    jobs: [],
  });
  expect(await service.cancelJob('missing')).toEqual({ status: 'not-found' });
  expect(listener).not.toHaveBeenCalled();
  unsubscribe();
  unsubscribe();
  await service.dispose();
  await service.dispose();
  await expect(service.discoverCapabilities()).rejects.toMatchObject({
    code: 'disposed',
  });
});

it('honors an already aborted probe before reporting unsupported media', async () => {
  const service: ConversionService = new UnsupportedConversionService();
  const controller = new AbortController();
  controller.abort();
  await expect(
    service.probe(
      { id: 'file', name: 'photo.png', sizeBytes: 100 },
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  await service.dispose();
});
