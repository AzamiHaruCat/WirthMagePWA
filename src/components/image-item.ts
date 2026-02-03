import { type ImageFile } from '@/utils/image-file';
import { LitElement, css, html, type CSSResultGroup } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './ui-icon';

const TAG_NAME = 'image-item';

@customElement(TAG_NAME)
export class ImageItem extends LitElement {
  static override styles?: CSSResultGroup = css`
    :host {
      display: block;
    }
    figure {
      margin: 0;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      position: relative;
    }
    img {
      max-width: 128px;
      max-height: 128px;
      object-fit: contain;
      background: #ccc;
    }
    figcaption {
      font-size: 0.8rem;
      text-align: center;
      word-break: break-all;
    }
    button {
      all: unset;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: 0;
      width: 24px;
      height: 24px;
    }
    ui-icon {
      width: 18px;
      height: 18px;
      paint-order: stroke;
      stroke: #fff;
      stroke-width: 5px;
    }
  `;

  @property({ attribute: false })
  data: ImageFile | null = null;

  protected override render(): unknown {
    if (!this.data) return null;

    const { file, previewUrl, width, height } = this.data;

    return html`
      <figure>
        <img
          src=${previewUrl}
          alt=${file.name}
          @dragstart=${(e: Event) => e.preventDefault()}
        />
        <figcaption>
          ${file.name} (${width}x${height})
          <button @click=${this.#dispatchRemove} title="画像を削除">
            <ui-icon type="close"></ui-icon>
          </button>
        </figcaption>
      </figure>
    `;
  }

  #dispatchRemove = (): void => {
    this.dispatchEvent(
      new CustomEvent('remove', {
        bubbles: true,
        composed: true,
        detail: { id: this.data?.id },
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ImageItem;
  }
}
