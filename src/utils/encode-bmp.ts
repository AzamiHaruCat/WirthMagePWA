import * as iq from 'image-q';

export function encodeBMP(
  container: iq.utils.PointContainer,
  palette: iq.utils.Palette | null,
): Blob {
  const width = container.getWidth();
  const height = container.getHeight();
  const pointArray = container.getPointArray();
  const colorMap = new Map<number, number>();

  let bitDepth: 4 | 8 | 24;
  let colorCount = 0;
  let palettePoints: iq.utils.Point[] = [];

  if (palette) {
    palettePoints = palette.getPointContainer().getPointArray();
    colorCount = palettePoints.length;
    bitDepth = colorCount <= 16 ? 4 : 8;
    palettePoints.forEach((p, i) => {
      const key = (p.r << 16) | (p.g << 8) | p.b;
      colorMap.set(key, i);
    });
  } else {
    bitDepth = 24;
  }

  const paletteSize = bitDepth === 24 ? 0 : colorCount * 4;

  const rowSize = Math.floor((bitDepth * width + 31) / 32) * 4;
  const pixelDataSize = rowSize * height;

  const fileOffset = 14 + 40 + paletteSize;
  const fileSize = fileOffset + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const fullByteView = new Uint8Array(buffer);

  // --- BITMAPFILEHEADER ---
  view.setUint16(0, 0x4d42, true);
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, fileOffset, true); // 動的なオフセット

  // --- BITMAPINFOHEADER ---
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Bottom-Up
  view.setUint16(26, 1, true);
  view.setUint16(28, bitDepth, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 0, true);
  view.setInt32(42, 0, true);
  view.setUint32(46, colorCount, true);
  view.setUint32(50, colorCount, true);

  // --- Palette ---
  if (bitDepth !== 24) {
    for (let i = 0; i < colorCount; i++) {
      const offset = 14 + 40 + i * 4;
      const p = palettePoints[i];
      view.setUint8(offset, p.b);
      view.setUint8(offset + 1, p.g);
      view.setUint8(offset + 2, p.r);
      view.setUint8(offset + 3, 0);
    }
  }

  // --- Pixel Data ---
  for (let y = 0; y < height; y++) {
    const targetY = height - 1 - y;
    const rowStart = fileOffset + targetY * rowSize;

    fullByteView.fill(0, rowStart, rowStart + rowSize);

    for (let x = 0; x < width; x++) {
      const point = pointArray[y * width + x];
      const colorKey = (point.r << 16) | (point.g << 8) | point.b;

      if (bitDepth === 24) {
        const pos = rowStart + x * 3;
        view.setUint8(pos, point.b);
        view.setUint8(pos + 1, point.g);
        view.setUint8(pos + 2, point.r);
      } else {
        const colorIdx = colorMap.get(colorKey) ?? 0;

        if (bitDepth === 8) {
          view.setUint8(rowStart + x, colorIdx);
        } else {
          const bytePos = rowStart + Math.floor(x / 2);
          if (x % 2 === 0) {
            view.setUint8(bytePos, (colorIdx & 0x0f) << 4);
          } else {
            const b = view.getUint8(bytePos);
            view.setUint8(bytePos, b | (colorIdx & 0x0f));
          }
        }
      }
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}
