import { ImageProcessor, type ConvertOptions } from '@/utils/image-processor';

const processor = new ImageProcessor();

export interface WorkerInput {
  file: File;
  options: ConvertOptions;
  outputType: 'BMP' | 'PNG' | 'JPEG';
}

export interface WorkerOutput {
  blob?: Blob;
  error?: string;
}

const tasks: WorkerInput[] = [];

const processTask = async () => {
  const { file, options, outputType } = tasks[0];

  try {
    const imageBitmap = await createImageBitmap(file, {
      colorSpaceConversion: 'none',
    });
    const canvas = await processor.process(imageBitmap, options);

    let blob: Blob;
    if (outputType === 'BMP') {
      blob = processor.encodeBMP();
    } else if (outputType === 'PNG' && options.colors) {
      blob = await processor.encodePNG(!!options.mask);
    } else {
      const mime = outputType === 'JPEG' ? 'image/jpeg' : 'image/png';
      const quality = outputType === 'JPEG' ? 0.85 : undefined;
      blob = await canvas.convertToBlob({ type: mime, quality });
    }

    imageBitmap.close();
    canvas.width = canvas.height = 0;

    const output: WorkerOutput = { blob };
    self.postMessage(output);
  } catch (err) {
    const error = (err as Error).message ?? 'Unknown error';
    const output: WorkerOutput = { error };
    self.postMessage(output);
  }

  tasks.shift();
};

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  tasks.push(e.data);
  if (tasks.length > 1) return;

  while (tasks.length > 0) await processTask();
};
