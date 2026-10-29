import {
  formats,
  type Capabilities,
  type CancelResult,
} from '@honeymelon/contracts';
import {
  ConversionServiceError,
  type ConversionQueue,
  type ConversionRequest,
  type ConversionService,
  type InputFile,
} from '@honeymelon/core';
import type { MediaMetadata } from '@honeymelon/contracts';

/**
 * A service that advertises nothing, for contract fixtures and hosts that
 * must render the shared UI without any conversion capability.
 */
export class UnsupportedConversionService implements ConversionService {
  private disposed = false;

  async discoverCapabilities(): Promise<Capabilities> {
    this.assertOpen();

    return {
      video: this.unavailable(formats.video),
      audio: this.unavailable(formats.audio),
      image: this.unavailable(formats.image),
    };
  }

  async probe(_file: InputFile, signal?: AbortSignal): Promise<MediaMetadata> {
    this.assertOpen();
    signal?.throwIfAborted();

    throw new ConversionServiceError(
      'unsupported',
      'Browser probe unavailable',
    );
  }

  async enqueue(_request: ConversionRequest): Promise<ConversionQueue> {
    this.assertOpen();

    throw new ConversionServiceError(
      'unsupported',
      'Browser conversion is not available yet',
    );
  }

  async getSnapshot(): Promise<ConversionQueue> {
    this.assertOpen();

    return { revision: 0, batches: [], jobs: [] };
  }

  subscribe(_listener: (queue: ConversionQueue) => void): () => void {
    this.assertOpen();

    return () => {};
  }

  async cancelJob(_id: string): Promise<CancelResult> {
    this.assertOpen();

    return { status: 'not-found' };
  }

  async cancelBatch(_id: string): Promise<CancelResult> {
    this.assertOpen();

    return { status: 'not-found' };
  }

  async dispose(): Promise<void> {
    this.disposed = true;
  }

  private unavailable(values: readonly string[]): Capabilities['image'] {
    return values.map((format) => ({
      format,
      available: false,
      reason: 'Browser conversion is not available yet',
    }));
  }

  private assertOpen(): void {
    if (this.disposed) {
      throw new ConversionServiceError('disposed', 'Conversion service closed');
    }
  }
}
