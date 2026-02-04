import type { ConverterSetting } from '@/components/converter-setting';
import type { ImageInput } from '@/components/image-input';
import { getDirectoryHandle } from '@/utils/file-system';
import { fileToCanvas } from '@/utils/image-file';
import { ImageProcessor, type ConvertOptions } from '@/utils/image-processor';
import { encodeJPEG, optimisePNG } from '@/utils/squoosh-util';
import type { ReactiveController, ReactiveControllerHost } from 'lit';

interface ImageProcessorControllerHost extends ReactiveControllerHost, HTMLElement {
  isProcessing: boolean;
  processedCount: number;
  imageInput: ImageInput;
  setting: ConverterSetting;
}

export class ImageProcessorController implements ReactiveController {
  readonly host: ImageProcessorControllerHost;

  #processor = new ImageProcessor();
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
        const currentOptions = { ...options, scale: factor };

        try {
          switch (outputType) {
            case 'BMP':
              await this.#outputBMP(canvas, targetDir, currentName, currentOptions);
              break;
            case 'PNG':
              await this.#outputPNG(canvas, targetDir, currentName, currentOptions);
              break;
            case 'JPEG':
              await this.#outputJPEG(canvas, targetDir, currentName, currentOptions);
              break;
          }
        } catch (e) {
          console.error('処理中にエラーが発生しました:', e);
          this.host.isProcessing = false;
          return;
        }
      }

      this.host.processedCount++;
      processedNames.add(baseName);
      canvas.width = canvas.height = 0;

      if (this.canceled) break;
    }

    this.host.isProcessing = false;
  }

  async #outputBMP(
    sourceCanvas: HTMLCanvasElement,
    targetDir: FileSystemDirectoryHandle,
    fileName: string,
    options: ConvertOptions,
  ): Promise<void> {
    const canvas = await this.#processor.process(sourceCanvas, options);
    const blob = this.#processor.encodeBMP();
    canvas.width = canvas.height = 0;
    if (blob) await this.#writeFile(targetDir, fileName, blob);
  }

  async #outputPNG(
    sourceCanvas: HTMLCanvasElement,
    targetDir: FileSystemDirectoryHandle,
    fileName: string,
    options: ConvertOptions,
  ): Promise<void> {
    const canvas = await this.#processor.process(sourceCanvas, options);
    let blob: Blob | null = null;

    if (options.colors) {
      blob = await this.#processor.encodePNG(options.mask);
    } else {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const buffer = await optimisePNG(imageData, { level: 2 });
          blob = new Blob([buffer], { type: 'image/png' });
        }
      } catch (e) {
        console.error(e);
        blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });
      }
    }

    canvas.width = canvas.height = 0;
    if (blob) await this.#writeFile(targetDir, fileName, blob);
  }

  async #outputJPEG(
    sourceCanvas: HTMLCanvasElement,
    targetDir: FileSystemDirectoryHandle,
    fileName: string,
    options: ConvertOptions,
  ): Promise<void> {
    const canvas = await this.#processor.process(sourceCanvas, options);
    let blob: Blob | null = null;

    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const buffer = await encodeJPEG(imageData, {
          quality: 85,
          progressive: true,
          optimize_coding: true,
        });
        blob = new Blob([buffer], { type: 'image/jpeg' });
      }
    } catch (e) {
      console.error(e);
      blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });
    }

    canvas.width = canvas.height = 0;
    if (blob) await this.#writeFile(targetDir, fileName, blob);
  }

  async #writeFile(targetDir: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
    const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}
