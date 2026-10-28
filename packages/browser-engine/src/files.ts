import { acceptsFile, mediaTypes, type MediaType } from '@honeymelon/contracts';
import { ConversionServiceError, type InputFile } from '@honeymelon/core';

/** A converted result held in memory until downloaded and removed. */
export interface BrowserOutput {
  name: string;
  blob: Blob;
}

/**
 * Own selected File handles and converted Blobs. Nothing here is persisted:
 * reload discards every handle, and cleanup releases outputs immediately.
 */
export class BrowserFileStore {
  private readonly inputs = new Map<
    string,
    { file: File; media: MediaType | undefined }
  >();

  private readonly outputs = new Map<string, BrowserOutput>();

  constructor(private readonly maxFiles: number) {}

  /** Register a user-selected file and return its opaque descriptor. */
  register(file: File): InputFile {
    if (this.inputs.size >= this.maxFiles) {
      throw new ConversionServiceError(
        'invalid-input',
        `The browser queue holds up to ${this.maxFiles} files`,
      );
    }

    const id = crypto.randomUUID();
    this.inputs.set(id, {
      file,
      media: mediaTypes.find((media) => acceptsFile(media, file.name)),
    });

    return { id, name: file.name, sizeBytes: file.size };
  }

  /** Resolve a descriptor; never trusts names or sizes from callers. */
  input(id: string): File | undefined {
    return this.inputs.get(id)?.file;
  }

  /** Release a source handle after its row is removed. */
  forget(id: string): void {
    this.inputs.delete(id);
  }

  /** Release every source handle that belongs to a media view. */
  forgetMedia(media: MediaType): void {
    for (const [id, input] of this.inputs) {
      if (input.media === media) {
        this.inputs.delete(id);
      }
    }
  }

  /**
   * Keep an output under a deterministic, collision-free download name:
   * `photo.jpg`, then `photo (2).jpg`, in completion order.
   */
  setOutput(jobId: string, blob: Blob, name: string): BrowserOutput {
    const used = new Set([...this.outputs.values()].map((item) => item.name));
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';
    let unique = name;
    for (let index = 2; used.has(unique); index++) {
      unique = `${stem} (${index})${extension}`;
    }

    const output = { name: unique, blob };
    this.outputs.set(jobId, output);

    return output;
  }

  /** The converted result for a succeeded job, if still retained. */
  output(jobId: string): BrowserOutput | undefined {
    return this.outputs.get(jobId);
  }

  /** Every retained output in completion order. */
  allOutputs(): [string, BrowserOutput][] {
    return [...this.outputs.entries()];
  }

  /** Drop a retained output so its memory can be reclaimed. */
  deleteOutput(jobId: string): void {
    this.outputs.delete(jobId);
  }

  /** Total bytes of converted results currently held in memory. */
  retainedBytes(): number {
    let total = 0;
    for (const { blob } of this.outputs.values()) {
      total += blob.size;
    }

    return total;
  }

  /** Release every handle on disposal. */
  clear(): void {
    this.inputs.clear();
    this.outputs.clear();
  }
}
