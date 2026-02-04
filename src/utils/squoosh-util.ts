import _decodeJPEG, { init as initDecodeJPEG } from '@jsquash/jpeg/decode';
import _encodeJPEG, { init as initEncodeJPEG } from '@jsquash/jpeg/encode';
import type { DecodeOptions, EncodeOptions } from '@jsquash/jpeg/meta';
import { optimise as _optimisePNG } from '@jsquash/oxipng';
import type { OptimiseOptions } from '@jsquash/oxipng/meta';
import { init as initPNG } from '@jsquash/oxipng/optimise';

const initializeMozJPEG = Promise.all([initDecodeJPEG(), initEncodeJPEG()]);
const initializeOxiPNG = initPNG();

export const optimisePNG = async (
  data: ArrayBuffer | ImageData,
  options?: Partial<OptimiseOptions>,
): Promise<ArrayBuffer> => {
  await initializeOxiPNG;
  return _optimisePNG(data, options);
};

export const decodeJPEG = async (
  buffer: ArrayBuffer,
  options?: Partial<DecodeOptions>,
): Promise<ImageData> => {
  await initializeMozJPEG;
  return _decodeJPEG(buffer, options);
};

export const encodeJPEG = async (
  data: ImageData,
  options?: Partial<EncodeOptions>,
): Promise<ArrayBuffer> => {
  await initializeMozJPEG;
  return _encodeJPEG(data, options);
};
