import { encodePNG } from '@/utils/encode-png';
import * as iq from 'image-q';
import Pica from 'pica';
import { Dimension, DimensionPreset, type DimensionPresetType } from './dimension';
import { encodeBMP } from './encode-bmp';
import {
  applyBinaryAlpha,
  calculateCenterCrop,
  drawOutline,
  updateCanvasImageData,
  type OutlineStyle,
} from './image-utils';

const pica = new Pica();

export interface ConvertOptions {
  imageSize?: DimensionPresetType | 'ASIS';
  scale?: number;
  colors?: number;
  mask?: boolean;
  outline?: OutlineStyle;
}

export class ImageProcessor {
  private lastIndexedContainer: iq.utils.PointContainer | null = null;
  private lastPalette: iq.utils.Palette | null = null;

  async process(
    sourceCanvas: HTMLCanvasElement,
    options: ConvertOptions = {},
  ): Promise<HTMLCanvasElement> {
    this.lastIndexedContainer = null;
    this.lastPalette = null;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(sourceCanvas, 0, 0);

    const bgColor = options.mask ? this.mask(canvas) : null;

    const { imageSize = 'ASIS', scale = 1 } = options;
    if (imageSize !== 'ASIS') {
      const dimension = DimensionPreset[imageSize].scale(scale);
      await this.resize(canvas, dimension);

      if (options.mask) {
        // リサイズでぼやけたアルファチャンネルを2値化
        updateCanvasImageData(canvas, applyBinaryAlpha);
      }
    }

    if (options.outline && options.mask) {
      const { outline } = options;
      updateCanvasImageData(canvas, (data) => drawOutline(data, outline));
    }

    if (options.colors) {
      // 背景色をディザリングしないために透過した状態で減色
      await this.quantize(canvas, options.colors);
    }

    if (bgColor) {
      this.flattenBackground(canvas, bgColor);
    }

    this.refreshFinalData(canvas, options.colors ?? 0);

    return canvas;
  }

  private mask(canvas: HTMLCanvasElement): string {
    let r!: number, g!: number, b!: number;

    updateCanvasImageData(canvas, ({ data }) => {
      [r, g, b] = data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === r && data[i + 1] === g && data[i + 2] === b) {
          data[i + 3] = 0;
        } else {
          data[i + 3] = data[i + 3] < 128 ? 0 : 255;
        }
      }
    });

    return `rgb(${r},${g},${b})`;
  }

  private async resize(canvas: HTMLCanvasElement, dimension: Dimension): Promise<void> {
    const rect = calculateCenterCrop(
      canvas.width,
      canvas.height,
      dimension.width,
      dimension.height,
    );

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = rect.width;
    croppedCanvas.height = rect.height;

    const croppedCtx = croppedCanvas.getContext('2d')!;
    croppedCtx.drawImage(
      canvas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height,
    );

    canvas.width = dimension.width;
    canvas.height = dimension.height;

    await pica.resize(croppedCanvas, canvas, {
      unsharpAmount: 50,
      unsharpRadius: 0.6,
      unsharpThreshold: 2,
    });
  }

  private async quantize(canvas: HTMLCanvasElement, colors: number): Promise<void> {
    updateCanvasImageData(canvas, (data) => {
      const inPointContainer = iq.utils.PointContainer.fromImageData(data);

      const palette = iq.buildPaletteSync([inPointContainer], {
        paletteQuantization: 'wuquant',
        colors: Math.max(2, Math.min(256, Math.round(colors))),
      });

      const imageQuantizer = new iq.image.ErrorDiffusionArray(
        new iq.distance.Euclidean(),
        iq.image.ErrorDiffusionArrayKernel.FloydSteinberg,
      );
      const outPointContainer = imageQuantizer.quantizeSync(inPointContainer, palette);

      this.lastIndexedContainer = outPointContainer;
      this.lastPalette = palette;

      return new ImageData(
        new Uint8ClampedArray(outPointContainer.toUint8Array()),
        canvas.width,
        canvas.height,
      );
    });
  }

  /**
   * 最終的なピクセルデータからBMP用のパレットとインデックスを生成
   */
  private refreshFinalData(canvas: HTMLCanvasElement, colors: number): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const container = iq.utils.PointContainer.fromImageData(data);

    if (colors > 0) {
      const tempPalette = iq.buildPaletteSync([container], {
        paletteQuantization: 'wuquant',
        colors: colors,
      });
      const points = container.getPointArray();
      const bgPoint = points[0];

      const rawPalettePoints = tempPalette.getPointContainer().getPointArray();
      const filteredPoints = rawPalettePoints.filter(
        (p) => !(p.r === bgPoint.r && p.g === bgPoint.g && p.b === bgPoint.b),
      );

      const finalPoints = [bgPoint, ...filteredPoints].slice(0, colors);
      const finalPointContainer = new iq.utils.PointContainer();
      finalPointContainer.setHeight(1);
      finalPointContainer.setWidth(finalPoints.length);
      const finalArray = finalPointContainer.getPointArray();
      finalPoints.forEach((p, i) => (finalArray[i] = p));

      this.lastPalette = new iq.utils.Palette();
      const paletteArray = this.lastPalette.getPointContainer().getPointArray();
      paletteArray.splice(0, paletteArray.length, ...finalPoints);

      const distance = new iq.distance.Euclidean();
      const modifier = new iq.image.NearestColor(distance);
      this.lastIndexedContainer = modifier.quantizeSync(container, this.lastPalette);
    } else {
      this.lastIndexedContainer = container;
      this.lastPalette = null;
    }
  }

  /**
   * 透過部分を背景色で塗りつぶす
   */
  private flattenBackground(canvas: HTMLCanvasElement, bgColor: string): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * 保持しているデータから BMP 形式の Blob を生成
   */
  public encodeBMP(): Blob {
    if (!this.lastIndexedContainer) {
      throw new Error('処理済みのデータがありません。');
    }
    return encodeBMP(this.lastIndexedContainer, this.lastPalette);
  }

  /**
   * 保持しているデータから PNG 形式の Blob を生成
   */
  public encodePNG(mask: boolean = false): Promise<Blob> {
    if (!this.lastIndexedContainer || !this.lastPalette) {
      throw new Error('データが不足しています。');
    }

    return encodePNG(this.lastIndexedContainer, this.lastPalette, mask);
  }
}
