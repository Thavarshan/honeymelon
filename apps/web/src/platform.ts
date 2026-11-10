import {
  BrowserConversionService,
  deviceLimits,
} from '@honeymelon/browser-engine';
import MediaWorker from '@honeymelon/browser-engine/worker?worker';
import type { MediaType } from '@honeymelon/contracts';
import type { ConverterPlatform } from '@honeymelon/converter';
import type { ConversionQueue, InputFile } from '@honeymelon/core';
import { strToU8, Zip, ZipPassThrough } from 'fflate';
import i18n from './i18n';

const MiB = 1024 * 1024;

/** Archive assembly needs additional memory on top of retained outputs. */
export const maxZipBytes = 64 * MiB;

/** Observable state for the browser host's export controls. */
export interface DownloadStatus {
  phase: 'idle' | 'preparing';
  percent: number;
  awaitingConfirmation: number;
}

/** Store ZIP entries without reading every source Blob into memory at once. */
async function zipOutputs(
  outputs: ReturnType<BrowserConversionService['outputs']>,
  signal: AbortSignal,
  progress: (bytes: number) => void,
): Promise<Blob> {
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let resolveEnd!: () => void;
  let rejectEnd!: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveEnd = resolve;
    rejectEnd = reject;
  });
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      rejectEnd(error);

      return;
    }

    if (chunk.length) {
      // fflate reuses some of its internal buffers; own each archive chunk.
      parts.push(new Uint8Array(chunk));
    }

    if (final) {
      resolveEnd();
    }
  });
  let processed = 0;
  try {
    for (const [, output] of outputs) {
      signal.throwIfAborted();
      const entry = new ZipPassThrough(output.name);
      zip.add(entry);
      // Blob.slice avoids loading a whole output; each chunk is at most 1 MiB.
      for (let offset = 0; offset < output.blob.size; offset += MiB) {
        signal.throwIfAborted();
        const slice = output.blob.slice(offset, offset + MiB);
        const bytes = new Uint8Array(await slice.arrayBuffer());
        signal.throwIfAborted();
        entry.push(bytes);
        processed += bytes.byteLength;
        progress(processed);
        // Give the browser a chance to paint and accept cancellation.
        if (processed % (4 * MiB) < bytes.byteLength) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
      }

      entry.push(new Uint8Array(), true);
    }

    const readme = new ZipPassThrough('README.txt');
    zip.add(readme);
    readme.push(
      strToU8('Converted locally in your browser by Honeymelon Web.\n'),
      true,
    );
    zip.end();
    await completed;
    signal.throwIfAborted();

    return new Blob(parts, { type: 'application/zip' });
  } catch (error) {
    zip.terminate();
    // `completed` has no consumer when assembly fails before zip.end().
    void completed.catch(() => {});
    throw error;
  }
}

/** Save a Blob through a temporary object URL that is always revoked. */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.hidden = true;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Some engines read the URL after click returns.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

/**
 * The browser host: selected File handles, conversion and outputs stay in
 * this tab. Downloads go through the browser's own download manager.
 */
export class WebConverterPlatform implements ConverterPlatform {
  readonly mediaTypes: readonly MediaType[] = ['image', 'audio', 'video'];

  readonly outputAction = {
    kind: 'download' as const,
    label: (): string => i18n.t('web.download'),
    run: async (id: string): Promise<void> => this.download(id),
  };

  private readonly requested = new Set<string>();

  private readonly confirmed = new Set<string>();

  private readonly listeners = new Set<() => void>();

  private zipController: AbortController | undefined;

  private status: DownloadStatus = {
    phase: 'idle',
    percent: 0,
    awaitingConfirmation: 0,
  };

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };

  readonly downloadStatus = (): DownloadStatus => this.status;

  private notify(change: Partial<DownloadStatus> = {}): void {
    this.status = {
      ...this.status,
      ...change,
      awaitingConfirmation: this.service
        .outputs()
        .filter(([id]) => this.requested.has(id) && !this.confirmed.has(id))
        .length,
    };
    this.listeners.forEach((listener) => listener());
  }

  constructor(
    readonly service: BrowserConversionService = new BrowserConversionService({
      createWorker: () => new MediaWorker(),
      limits: deviceLimits(
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      ),
    }),
  ) {}

  intake(files: File[]): InputFile[] {
    return this.service.intake(files);
  }

  async removeItem(id: string): Promise<ConversionQueue> {
    const queue = await this.service.removeItem(id);
    this.notify();

    return queue;
  }

  async clearMedia(media: MediaType): Promise<ConversionQueue> {
    const queue = await this.service.clearMedia(media);
    this.notify();

    return queue;
  }

  /** Save one converted file under its collision-free name. */
  download(jobId: string): void {
    const output = this.service.output(jobId);
    if (!output) {
      throw new Error(i18n.t('web.outputGone'));
    }

    saveBlob(output.blob, output.name);
    this.requested.add(jobId);
    this.notify();
  }

  /** Request one ZIP download. The browser cannot report disk persistence. */
  async downloadAll(now = new Date()): Promise<void> {
    if (this.zipController) {
      throw new Error(i18n.t('web.zipBusy'));
    }

    const outputs = this.service.outputs();
    if (!outputs.length) {
      return;
    }

    const total = outputs.reduce(
      (sum, [, output]) => sum + output.blob.size,
      0,
    );
    if (total > maxZipBytes) {
      throw new Error(i18n.t('web.zipTooLarge', { limit: '64 MiB' }));
    }

    const controller = new AbortController();
    this.zipController = controller;
    this.notify({ phase: 'preparing', percent: 0 });
    try {
      const blob = await zipOutputs(outputs, controller.signal, (bytes) =>
        this.notify({
          percent: total ? Math.round((100 * bytes) / total) : 100,
        }),
      );
      const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
      saveBlob(blob, `honeymelon-${stamp}.zip`);
      for (const [jobId] of outputs) {
        this.requested.add(jobId);
      }
    } finally {
      this.zipController = undefined;
      this.notify({ phase: 'idle', percent: 0 });
    }
  }

  cancelZipExport(): void {
    this.zipController?.abort();
  }

  /** Only an explicit user acknowledgement clears a tab-close warning. */
  confirmRequestedDownloads(): void {
    for (const [id] of this.service.outputs()) {
      if (this.requested.has(id)) {
        this.confirmed.add(id);
      }
    }

    this.notify();
  }

  /** Finished outputs that have not been explicitly confirmed as saved. */
  unsaved(): number {
    return this.service
      .outputs()
      .filter(([jobId]) => !this.confirmed.has(jobId)).length;
  }
}
