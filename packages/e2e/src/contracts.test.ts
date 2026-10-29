import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  ConversionEngine,
  NativeConversionService,
  type Executor,
} from '@honeymelon/engine';
import {
  QueueConversionService,
  outputFilename,
  type ConversionRequest,
  type ConversionService,
  type QueueExecutor,
} from '@honeymelon/core';
import { UnsupportedConversionService } from '@honeymelon/browser-engine';
import type { Capabilities } from '@honeymelon/contracts';

const capabilities: Capabilities = {
  image: [{ format: 'png', available: true }],
  audio: [],
  video: [],
};
const metadata = {
  duration: null,
  width: 8,
  height: 6,
  videoCodec: null,
  frames: 1,
  audio: [],
};

function controlled() {
  const started: string[] = [];
  const operations: {
    finish(): void;
    fail(error?: Error): void;
    progress(value: number): void;
  }[] = [];
  const outputs: string[] = [];
  let active = 0;
  let maximum = 0;
  let allowCleanup = () => {};

  let cleanupGate = Promise.resolve();
  const execute: QueueExecutor['execute'] = (job, signal, report) => {
    active++;
    maximum = Math.max(maximum, active);
    started.push(job.itemId);

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (error?: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        signal.removeEventListener('abort', abort);
        active--;
        if (error) {
          reject(error);

          return;
        }

        const base = outputFilename(job.name, job.outputFormat);
        let name = base;
        let suffix = 0;
        while (outputs.includes(name)) {
          name = base.replace(/\.[^.]+$/, ` (${++suffix}).${job.outputFormat}`);
        }

        outputs.push(name);
        resolve();
      };

      const abort = () => {
        void cleanupGate.then(() =>
          settle(new DOMException('Canceled', 'AbortError')),
        );
      };

      operations.push({
        finish: () => settle(),
        fail: (error = new Error('Corrupt fixture')) => settle(error),
        progress: (value) => report(value),
      });
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) {
        abort();
      }
    });
  };

  return {
    execute,
    started,
    operations,
    outputs,
    maximum: () => maximum,
    holdCleanup() {
      cleanupGate = new Promise((resolve) => {
        allowCleanup = resolve;
      });
    },
    releaseCleanup() {
      allowCleanup();
    },
  };
}

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

async function harness(kind: 'native' | 'portable') {
  const controller = controlled();
  let service: ConversionService;
  let request: ConversionRequest;
  if (kind === 'native') {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'honeymelon-contract-'),
    );
    const execute: Executor = async (job, signal, progress) => {
      await controller.execute(job, signal, progress);

      return path.join(directory, controller.outputs.at(-1) ?? 'unused.png');
    };

    const engine = new ConversionEngine(capabilities, execute);
    const native = new NativeConversionService(engine, capabilities);
    service = native;
    const files = [0, 1].map((index) =>
      native.registerInput({
        itemId: `input-${index}`,
        inputPath: path.join(directory, 'fixture.png'),
        name: 'fixture.png',
        sizeBytes: 100,
      }),
    );
    request = {
      mediaType: 'image',
      files,
      target: native.registerTarget(directory),
      outputFormat: 'png',
    };
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
  } else {
    service = new QueueConversionService({
      capabilities: async () => capabilities,
      validate: async () => {},
      probe: async () => metadata,
      execute: controller.execute,
      cleanup: async () => {},
    });
    request = {
      mediaType: 'image',
      files: [0, 1].map((index) => ({
        id: `input-${index}`,
        name: 'fixture.png',
        sizeBytes: 100,
      })),
      target: { id: 'downloads' },
      outputFormat: 'png',
    };
  }

  cleanups.push(async () => {
    controller.releaseCleanup();
    await service.dispose();
  });

  return { service, request, controller };
}

async function state(service: ConversionService, expected: string[]) {
  await vi.waitFor(async () => {
    expect((await service.getSnapshot()).jobs.map((job) => job.state)).toEqual(
      expected,
    );
  });
}

for (const kind of ['native', 'portable'] as const) {
  describe(`${kind} conversion service contract`, () => {
    it('runs FIFO in one slot, freezes settings and isolates snapshots/listeners', async () => {
      const { service, request, controller } = await harness(kind);
      const first = vi.fn();
      const second = vi.fn();
      const unsubscribe = service.subscribe(first);
      service.subscribe(second);
      unsubscribe();
      unsubscribe();
      await service.enqueue(request);
      request.outputFormat = 'mutated';
      request.files[0]!.name = 'mutated';
      controller.operations[0]!.progress(45);
      const snapshot = await service.getSnapshot();
      expect(snapshot.jobs[0]?.progress).toBe(45);
      expect(snapshot.jobs[0]?.name).toBe('fixture.png');
      expect(snapshot.jobs[0]?.outputFormat).toBe('png');
      snapshot.jobs.length = 0;
      expect((await service.getSnapshot()).jobs).toHaveLength(2);
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalled();
      controller.operations[0]!.finish();
      await state(service, ['succeeded', 'running']);
      controller.operations[1]!.finish();
      await state(service, ['succeeded', 'succeeded']);
      expect(controller.started).toEqual(request.files.map((file) => file.id));
      expect(controller.maximum()).toBe(1);
      expect(controller.outputs).toEqual(['fixture.png', 'fixture (1).png']);
      const revision = (await service.getSnapshot()).revision;
      controller.operations[0]!.progress(99);
      expect((await service.getSnapshot()).revision).toBe(revision);
    });

    it('rejects unavailable outputs and advances after an executor timeout', async () => {
      const { service, request, controller } = await harness(kind);
      await expect(
        service.enqueue({ ...request, outputFormat: 'invalid' }),
      ).rejects.toThrow();
      expect((await service.getSnapshot()).jobs).toHaveLength(0);
      await service.enqueue(request);
      controller.operations[0]!.fail(
        new DOMException('Fixture timed out', 'TimeoutError'),
      );
      await state(service, ['failed', 'running']);
      expect((await service.getSnapshot()).jobs[0]?.error?.message).toContain(
        'timed out',
      );
      controller.operations[1]!.finish();
      await state(service, ['failed', 'succeeded']);
    });

    it('waits for abort cleanup, cancels queued siblings and ignores late success', async () => {
      const { service, request, controller } = await harness(kind);
      await service.enqueue(request);
      const initial = await service.getSnapshot();
      controller.holdCleanup();
      let finished = false;
      const cancellation = service
        .cancelBatch(initial.batches[0]!.id)
        .then(() => {
          finished = true;
        });
      await state(service, ['canceling', 'canceled']);
      expect(finished).toBe(false);
      controller.releaseCleanup();
      await cancellation;
      await state(service, ['canceled', 'canceled']);
      controller.operations[0]!.finish();
      expect(controller.outputs).toHaveLength(0);
      expect(await service.cancelJob(initial.jobs[0]!.id)).toEqual({
        status: 'already-terminal',
      });
      expect(await service.cancelJob('absent')).toEqual({
        status: 'not-found',
      });
      await service.dispose();
      await service.dispose();
      await expect(service.getSnapshot()).rejects.toMatchObject({
        code: 'disposed',
      });
    });
  });
}

it('keeps the unsupported browser stub explicitly unavailable', async () => {
  const service: ConversionService = new UnsupportedConversionService();
  expect(
    Object.values(await service.discoverCapabilities())
      .flat()
      .every((entry) => !entry.available),
  ).toBe(true);
  await service.dispose();
});

it('reports cleanup failure without claiming a successful cancellation', async () => {
  const controller = controlled();
  const service = new QueueConversionService({
    capabilities: async () => capabilities,
    validate: async () => {},
    probe: async () => metadata,
    execute: controller.execute,
    cleanup: async () => {
      throw new Error('Cleanup failed');
    },
  });
  const queue = await service.enqueue({
    mediaType: 'image',
    files: [{ id: 'source', name: 'fixture.png', sizeBytes: 1 }],
    target: { id: 'downloads' },
    outputFormat: 'png',
  });
  await expect(service.cancelJob(queue.jobs[0]!.id)).rejects.toThrow(
    'Cleanup failed',
  );
  expect((await service.getSnapshot()).jobs[0]?.state).toBe('failed');
  await expect(service.dispose()).rejects.toThrow('cleanup failed');
});

it('retains new admissions while clearing old asynchronous output resources', async () => {
  const controller = controlled();
  let release!: () => void;
  let cleaning = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const service = new QueueConversionService({
    capabilities: async () => capabilities,
    validate: async () => {},
    probe: async () => metadata,
    execute: controller.execute,
    cleanup: async () => {
      cleaning = true;
      await gate;
    },
  });
  const request: ConversionRequest = {
    mediaType: 'image',
    outputFormat: 'png',
    target: { id: 'downloads' },
    files: [{ id: 'first', name: 'fixture.png', sizeBytes: 1 }],
  };
  cleanups.push(async () => {
    release();
    await service.dispose();
  });
  await service.enqueue(request);
  controller.operations[0]!.finish();
  await state(service, ['succeeded']);
  const clear = service.clearMedia('image');
  await vi.waitFor(() => expect(cleaning).toBe(true));
  await service.enqueue({
    ...request,
    files: [{ ...request.files[0]!, id: 'new' }],
  });
  release();
  const queue = await clear;
  expect(queue.jobs.map((job) => job.itemId)).toEqual(['new']);
  controller.operations[1]!.finish();
  await state(service, ['succeeded']);
});
