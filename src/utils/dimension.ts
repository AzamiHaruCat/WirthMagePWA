export class Dimension {
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  get pixels(): number {
    return this.width * this.height;
  }

  get aspectRatio(): number {
    return this.width / this.height;
  }

  scale(factor: number): Dimension {
    return new Dimension(
      Math.floor(this.width * factor),
      Math.floor(this.height * factor),
    );
  }

  limitPixels(maxPixels: number): Dimension {
    if (this.pixels <= maxPixels) return new Dimension(this.width, this.height);
    const ratio = this.aspectRatio;
    const height = Math.sqrt(maxPixels / ratio);
    const width = height * ratio;
    return new Dimension(Math.floor(width), Math.floor(height));
  }
}

export const DimensionPreset = {
  FULL: new Dimension(632, 420),
  YADO: new Dimension(400, 260),
  CARD: new Dimension(74, 94),
} as const;

export type DimensionPresetType = keyof typeof DimensionPreset;
