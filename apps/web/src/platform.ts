import {
  BrowserConversionService,
  deviceLimits,
} from '@honeymelon/browser-engine';
import MediaWorker from '@honeymelon/browser-engine/worker?worker';
import type { MediaType } from '@honeymelon/contracts';
import type { ConverterPlatform } from '@honeymelon/converter';
import type { ConversionQueue, InputFile } from '@honeymelon/core';
import { strToU8, zipSync, type Zippable } from 'fflate';
import i18n from './i18n';

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

  private readonly downloaded = new Set<string>();

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

  removeItem(id: string): Promise<ConversionQueue> {
    return this.service.removeItem(id);
  }

  clearMedia(media: MediaType): Promise<ConversionQueue> {
    return this.service.clearMedia(media);
  }

  /** Save one converted file under its collision-free name. */
  download(jobId: string): void {
    const output = this.service.output(jobId);
    if (!output) {
      throw new Error(i18n.t('web.outputGone'));
    }

    saveBlob(output.blob, output.name);
    this.downloaded.add(jobId);
  }

  /** Save every retained output as one uncompressed ZIP archive. */
  async downloadAll(now = new Date()): Promise<void> {
    const outputs = this.service.outputs();
    if (!outputs.length) {
      return;
    }

    const entries: Zippable = {};
    for (const [, output] of outputs) {
      // Media is already compressed; storing avoids pointless CPU work.
      entries[output.name] = [
        new Uint8Array(await output.blob.arrayBuffer()),
        { level: 0 },
      ];
    }

    entries['README.txt'] = strToU8(
      'Converted locally in your browser by Honeymelon Web.\n',
    );
    const stamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    saveBlob(
      new Blob([zipSync(entries)], { type: 'application/zip' }),
      `honeymelon-${stamp}.zip`,
    );
    for (const [jobId] of outputs) {
      this.downloaded.add(jobId);
    }
  }

  /** Finished outputs that would be lost if the tab closed now. */
  unsaved(): number {
    return this.service
      .outputs()
      .filter(([jobId]) => !this.downloaded.has(jobId)).length;
  }
}
