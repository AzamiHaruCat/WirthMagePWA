import { type ConvertOptions, ImageProcessor } from "@/utils/image-processor";

const processor = new ImageProcessor();

export interface WorkerInput {
  file: File;
  options: ConvertOptions;
  outputType: "BMP" | "PNG" | "JPEG";
}

export interface WorkerOutput {
  blob?: Blob;
  error?: string;
}

const tasks: WorkerInput[] = [];
let isProcessing = false;

async function startProcess(): Promise<void> {
  if (isProcessing || tasks.length === 0) return;
  isProcessing = true;

  const { postMessage } = self as unknown as Worker;

  while (tasks.length > 0) {
    try {
      await processTask();
    } catch (err) {
      postMessage({ error: (err as Error).message } satisfies WorkerOutput);
    }
  }

  isProcessing = false;
}

async function processTask(): Promise<void> {
  const { file, options, outputType } = tasks.shift()!;
  const { postMessage } = self as unknown as Worker;

  let imageBitmap: ImageBitmap | null = null;

  try {
    imageBitmap = await createImageBitmap(file, {
      colorSpaceConversion: "none",
    });
    const canvas = await processor.process(imageBitmap, options);

    let blob: Blob;
    if (outputType === "BMP") {
      blob = processor.encodeBMP();
    } else if (outputType === "PNG" && options.colors) {
      blob = await processor.encodePNG(!!options.mask);
    } else {
      const mime = outputType === "JPEG" ? "image/jpeg" : "image/png";
      const quality = outputType === "JPEG" ? 0.85 : undefined;
      blob = await canvas.convertToBlob({ type: mime, quality });
    }

    canvas.width = canvas.height = 0;
    postMessage({ blob } satisfies WorkerOutput);
  } catch (err) {
    const error = (err as Error).message ?? "Unknown error";
    postMessage({ error } satisfies WorkerOutput);
  } finally {
    imageBitmap?.close();
  }
}

self.onmessage = (e: MessageEvent<WorkerInput>): void => {
  tasks.push(e.data);
  startProcess();
};
