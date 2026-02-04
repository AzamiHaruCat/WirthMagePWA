import { optimisePNG } from '@/utils/squoosh-util';
import * as iq from 'image-q';
import UPNG from 'upng-js';

export const encodePNG = async (
  container: iq.utils.PointContainer,
  palette: iq.utils.Palette,
  mask?: boolean,
): Promise<Blob> => {
  const width = container.getWidth();
  const height = container.getHeight();
  const points = container.getPointArray();

  const p0 = palette.getPointContainer().getPointArray()[0];

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    rgba[i * 4 + 0] = p.r;
    rgba[i * 4 + 1] = p.g;
    rgba[i * 4 + 2] = p.b;

    const isTransparent = mask && p.r === p0.r && p.g === p0.g && p.b === p0.b;
    rgba[i * 4 + 3] = isTransparent ? 0 : 255;
  }

  const buffer = UPNG.encode([rgba.buffer], width, height, points.length);

  try {
    const optimisedBuffer = await optimisePNG(buffer, { level: 2 });
    return new Blob([optimisedBuffer], { type: 'image/png' });
  } catch (e) {
    console.error(e);
    return new Blob([buffer], { type: 'image/png' });
  }
};
