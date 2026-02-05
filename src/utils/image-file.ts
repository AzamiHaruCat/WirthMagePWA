export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

export const getImageMeta = (file: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
};

export const getImageMetaAll = async (files: File[]): Promise<ImageFile[]> => {
  return (await Promise.allSettled(files.map((file) => getImageMeta(file))))
    .filter((r): r is PromiseFulfilledResult<ImageFile> => r.status === 'fulfilled')
    .map((r) => r.value);
};

export const revokeImageFile = (image: ImageFile): void => {
  URL.revokeObjectURL(image.previewUrl);
};

export const fileToCanvas = async (item: ImageFile): Promise<OffscreenCanvas> => {
  const canvas = new OffscreenCanvas(item.width, item.height);

  const bitmap = await createImageBitmap(item.file);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas;
};
