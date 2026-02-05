import type { ConverterSetting } from '@/components/converter-setting';
import type { ImageInput } from '@/components/image-input';
import { getDirectoryHandle } from '@/utils/file-system';
import { fileToCanvas } from '@/utils/image-file';
import type { ImageProcessor } from '@/utils/image-processor';
import { type WorkerInput, type WorkerOutput } from '@/workers/processor.worker';
import ProcessorWorker from '@/workers/processor.worker?worker';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

interface ImageProcessorControllerHost extends ReactiveControllerHost, HTMLElement {
  isProcessing: boolean;
  processedCount: number;
  imageInput: ImageInput;
  setting: ConverterSetting;
}

export class ImageProcessorController implements ReactiveController {
  readonly host: ImageProcessorControllerHost;

  canceled = false;

  constructor(host: ImageProcessorControllerHost) {
    (this.host = host).addController(this);
  }

  hostConnected(): void {}

  stopProcessing(): void {
    this.canceled = this.host.isProcessing;
    this.host.requestUpdate();
  }

  async startProcessing(): Promise<void> {
    if (this.host.isProcessing) return;

    const dirHandle = await getDirectoryHandle({
      id: 'wirthmage-output',
      mode: 'readwrite',
      startIn: 'downloads',
    });
    if (!dirHandle) return;

    this.host.isProcessing = true;
    this.host.processedCount = 0;
    this.canceled = false;

    const { setting } = this.host;
    const { outputSize, outputType } = setting;

    const worker = new ProcessorWorker();

    const options: Parameters<ImageProcessor['process']>[1] = {
      imageSize: outputSize,
      colors: setting.colors,
      mask: setting.mask,
      outline: setting.outlineStyle,
    };
    if (outputType === 'JPEG') {
      delete options.mask;
      delete options.colors;
      delete options.outline;
    } else if (!options.mask) {
      delete options.outline;
    }

    const scaleX2 = setting.scaleX2 && outputSize !== 'ASIS';
    const scaleX4 = setting.scaleX4 && outputSize !== 'ASIS';

    const ext = { BMP: '.bmp', PNG: '.png', JPEG: '.jpg' }[outputType];

    const processedNames = new Set();

    for (const item of this.host.imageInput.files) {
      const baseName = item.file.name.replace(/\.\w+$/, '');
      const targetDir = processedNames.has(baseName)
        ? await dirHandle.getDirectoryHandle(item.id, { create: true })
        : dirHandle;

      const canvas = await fileToCanvas(item);

      const scales = [
        { factor: 1, suffix: '', enabled: true },
        { factor: 2, suffix: '.x2', enabled: scaleX2 },
        { factor: 4, suffix: '.x4', enabled: scaleX4 },
      ];

      for (const { factor, suffix, enabled } of scales) {
        if (!enabled) continue;

        const currentName = baseName + suffix + ext;

        const blob = await new Promise<Blob>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
            if (e.data.error) reject(new Error(e.data.error));
            else if (e.data.blob) resolve(e.data.blob);
          };

          const input: WorkerInput = {
            file: item.file,
            options: { ...options, scale: factor },
            outputType,
          };

          worker.postMessage(input);
        });

        await this.#writeFile(targetDir, currentName, blob);
      }

      this.host.processedCount++;
      processedNames.add(baseName);
      canvas.width = canvas.height = 0;

      if (this.canceled) break;
    }

    this.host.isProcessing = false;
  }

  async #writeFile(targetDir: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
    const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}
