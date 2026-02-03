export interface OutlineStyle {
  inner?: string;
  outer?: string;
}

/**
 * 中央切り抜き座標計算
 */
export const calculateCenterCrop = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) => {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  let x, y, width, height;

  if (sourceRatio > targetRatio) {
    width = sourceHeight * targetRatio;
    height = sourceHeight;
    x = (sourceWidth - width) / 2;
    y = 0;
  } else {
    width = sourceWidth;
    height = sourceWidth / targetRatio;
    x = 0;
    y = (sourceHeight - height) / 2;
  }

  return { x, y, width, height };
};

/**
 * ImageDataに対して指定した関数を適用し、結果をCanvasに書き戻す
 */
export const updateCanvasImageData = (
  canvas: HTMLCanvasElement,
  processor: (data: ImageData) => void | ImageData,
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = processor(imgData);
  ctx.putImageData(result ?? imgData, 0, 0);
};

/**
 * 色をrgb配列に
 */
export const parseColor = (color: string): [number, number, number] => {
  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.append(temp);
  const style = window.getComputedStyle(temp).color;
  const match = style.match(/\d+/g);
  const [r, g, b] = match ? match.map(Number) : [0, 0, 0];
  temp.remove();
  return [r, g, b];
};

/**
 * アルファチャンネル2値化
 */
export const applyBinaryAlpha = (imageData: ImageData): void => {
  const { data } = imageData;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = data[i] < 128 ? 0 : 255;
  }
};

/**
 * 縁取り処理（ピクセル直接操作版）
 */
export const drawOutline = (imageData: ImageData, style: OutlineStyle): ImageData => {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4 + 3];
  }

  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const outData = output.data;

  const innerRGB = style.inner ? parseColor(style.inner) : null;
  const outerRGB = style.outer ? parseColor(style.outer) : null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const isOpaque = mask[i] >= 128;

      // Outer (外側1px)
      if (!isOpaque && outerRGB) {
        const hasOpaqueNeighbor =
          (x > 0 && mask[i - 1] >= 128) ||
          (x < width - 1 && mask[i + 1] >= 128) ||
          (y > 0 && mask[i - width] >= 128) ||
          (y < height - 1 && mask[i + width] >= 128);

        if (hasOpaqueNeighbor) {
          const idx = i * 4;
          outData[idx] = outerRGB[0];
          outData[idx + 1] = outerRGB[1];
          outData[idx + 2] = outerRGB[2];
          outData[idx + 3] = 255;
        }
      }

      // Inner (内側1px)
      if (isOpaque && innerRGB) {
        const hasTransparentNeighbor =
          (x > 0 && mask[i - 1] < 128) ||
          (x < width - 1 && mask[i + 1] < 128) ||
          (y > 0 && mask[i - width] < 128) ||
          (y < height - 1 && mask[i + width] < 128);

        if (hasTransparentNeighbor) {
          const idx = i * 4;
          outData[idx] = innerRGB[0];
          outData[idx + 1] = innerRGB[1];
          outData[idx + 2] = innerRGB[2];
          outData[idx + 3] = 255;
        }
      }
    }
  }

  return output;
};
