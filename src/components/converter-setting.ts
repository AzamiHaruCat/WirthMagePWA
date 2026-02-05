import type { FormInput } from '@/components/abstract/form-input';
import { requestSave, StorageController } from '@/controllers/storage-controller';
import type { JsonObject, Serializable } from '@/interfaces/serializable';
import { LABEL_HAS_CHECKS_STYLE } from '@/styles/label-has-checks.style';
import { type DimensionPresetType } from '@/utils/dimension';
import type { OutlineStyle } from '@/utils/image-utils';
import {
  css,
  html,
  LitElement,
  type CSSResultGroup,
  type HTMLTemplateResult,
  type PropertyValues,
} from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './custom-select';
import './image-input';

const TAG_NAME = 'converter-setting';

const OUTPUT_TYPES = ['BMP', 'PNG', 'JPEG'] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];

const BLACK = [0, 0, 0] as const;
const WHITE = [255, 255, 255] as const;

const OUTLINE_STYLES: Record<string, OutlineStyle> = {
  黒: { inner: BLACK },
  白: { inner: WHITE },
  '黒(外側)': { outer: BLACK },
  '白(外側)': { outer: WHITE },
  '黒+白(外側)': { inner: BLACK, outer: WHITE },
  '白+黒(外側)': { inner: WHITE, outer: BLACK },
} as const;

interface SettingData extends JsonObject {
  outputSize: DimensionPresetType | 'ASIS';
  scaleX2: boolean;
  scaleX4: boolean;
  outputType: OutputType;
  colors: number;
  mask: boolean;
  outline: string;
}

@customElement(TAG_NAME)
export class ConverterSetting extends LitElement implements Serializable<SettingData> {
  static override styles?: CSSResultGroup = css`
    :host {
      display: flex;
      flex-flow: column;
      gap: 0.5em;
      white-space: nowrap;
    }
    :focus-visible {
      outline: 2px solid #8ff;
      outline-offset: 2px;
    }
    * {
      box-sizing: border-box;
    }
    strong {
      color: #488;
    }
    label {
      ${LABEL_HAS_CHECKS_STYLE};
      &:has(custom-select) {
        gap: 0.5em;
        padding: 0;
      }
    }
    div[part] {
      display: grid;
      grid-template: auto / repeat(4, auto);
      gap: inherit;
      width: fit-content;
      > strong:first-child,
      > label:has([type='checkbox'], custom-select) {
        grid-column: 1 / -1;
      }
    }
    [name='colors'] {
      width: 9em;
    }
    [name='outline'] {
      width: 8em;
    }
  `;

  private _storage = new StorageController(this);

  @property()
  outputSize: DimensionPresetType | 'ASIS' = 'ASIS';

  @property({ type: Boolean })
  scaleX2 = false;

  @property({ type: Boolean })
  scaleX4 = false;

  @property()
  outputType: OutputType = 'BMP';

  @property({ type: Number })
  colors = 0;

  @property({ type: Boolean })
  mask = false;

  @property()
  outline: string = '';

  get outlineStyle(): OutlineStyle {
    return { ...(OUTLINE_STYLES[this.outline] ?? null) };
  }

  serialize(): SettingData {
    const { outputSize, scaleX2, scaleX4, outputType, colors, mask, outline } = this;
    return { outputSize, scaleX2, scaleX4, outputType, colors, mask, outline };
  }

  unserialize(value: SettingData): void {
    const { outputSize, scaleX2, scaleX4, outputType, colors, mask, outline } = value;
    this.outputSize = outputSize ?? this.outputSize;
    this.scaleX2 = scaleX2 ?? this.scaleX2;
    this.scaleX4 = scaleX4 ?? this.scaleX4;
    this.outputType = outputType ?? this.outputType;
    this.colors = colors ?? this.colors;
    this.mask = mask ?? this.mask;
    this.outline = outline ?? this.outline;
  }

  protected override render(): unknown {
    return [
      this.#renderOutputSize(),
      this.#renderOutputType(),
      this.#renderColors(),
      this.#renderOutline(),
    ];
  }

  protected override firstUpdated(_changedProperties: PropertyValues<this>): void {
    this.updateComplete.then(() => this._storage.load());
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    const keys = [
      'outputSize',
      'scaleX2',
      'scaleX4',
      'outputType',
      'colors',
      'mask',
      'outline',
    ] as (keyof ConverterSetting)[];
    const shouldSave = keys.some((key) => changedProperties.has(key));
    if (shouldSave) requestSave(this);
  }

  #renderOutputSize(): HTMLTemplateResult {
    return html`
      <div part="size">
        <strong>出力サイズ:</strong>
        ${repeat(
          Object.entries({
            ASIS: 'そのまま',
            CARD: 'カード',
            YADO: '冒険者の宿',
            FULL: 'フルサイズ',
          }) as [typeof this.outputSize, string][],
          ([key]) => key,
          ([key, value]) => html`
            <label>
              <input
                name="size"
                type="radio"
                ?checked=${this.outputSize === key}
                @change=${() => (this.outputSize = key)}
              />${value}
            </label>
          `,
        )}
        <label>
          <input
            name="x2"
            type="checkbox"
            ?checked=${this.scaleX2}
            ?disabled=${this.outputSize === 'ASIS'}
            @change=${() => (this.scaleX2 = !this.scaleX2)}
          />2倍サイズ
        </label>
        <label>
          <input
            name="x4"
            type="checkbox"
            ?checked=${this.scaleX4}
            ?disabled=${this.outputSize === 'ASIS'}
            @change=${() => (this.scaleX4 = !this.scaleX4)}
          />4倍サイズ
        </label>
      </div>
    `;
  }

  #renderOutputType(): HTMLTemplateResult {
    return html`
      <div part="type">
        <strong>出力形式:</strong>
        ${repeat(
          OUTPUT_TYPES,
          (key) => key,
          (key) => html`
            <label>
              <input
                name="type"
                type="radio"
                ?checked=${this.outputType === key}
                @change=${() => (this.outputType = key)}
              />${key}
            </label>
          `,
        )}
      </div>
    `;
  }

  #renderColors(): HTMLTemplateResult {
    return html`
      <div part="colors">
        <label>
          減色
          <custom-select
            name="colors"
            .value=${String(this.colors) as any}
            @input=${(e: Event) => {
              const input = e.target as FormInput<string>;
              this.colors = Number(input.value ?? 0);
            }}
            ?disabled=${this.outputType === 'JPEG'}
          >
            <span value="0">なし</span>
            <span value="256">256色 (8-bit)</span>
            <span value="128">128色</span>
            <span value="64">64色</span>
            <span value="32">32色</span>
            <span value="16">16色 (4-bit)</span>
            <span value="8">8色</span>
            <span value="4">4色</span>
            <span value="2">2色</span>
          </custom-select>
        </label>
        <label>
          <input
            name="mask"
            type="checkbox"
            ?checked=${this.mask}
            ?disabled=${this.outputType === 'JPEG'}
            @change=${() => (this.mask = !this.mask)}
          />透過色を保護
        </label>
      </div>
    `;
  }

  #renderOutline(): HTMLTemplateResult {
    return html`
      <div part="outline">
        <label>
          縁取り
          <custom-select
            name="outline"
            .value=${this.outline as any}
            @input=${(e: Event) => {
              const input = e.target as FormInput<string>;
              this.outline = input.value ?? '';
            }}
            ?disabled=${!this.mask || this.outputType === 'JPEG'}
          >
            <span value="">なし</span>
            ${repeat(
              Object.keys(OUTLINE_STYLES),
              (key) => key,
              (key) => html`<span value="${key}">${key}</span>`,
            )}
          </custom-select>
        </label>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ConverterSetting;
  }
}
