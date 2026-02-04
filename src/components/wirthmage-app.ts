import { ImageProcessorController } from '@/controllers/image-processor-controller';
import { BUTTON_STYLE } from '@/styles/button.style';
import { LitElement, css, html, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import './converter-setting';
import type { ConverterSetting } from './converter-setting';
import './image-input';
import type { ImageInput } from './image-input';

const TAG_NAME = 'wirthmage-app';

const APP_MODE_QUERY = window.matchMedia(`
  (display-mode: standalone),
  (display-mode: minimal-ui),
  (display-content: window-controls-overlay)
`);

const FILE_SYSTEM_ENABLED =
  'FileSystemDirectoryHandle' in window &&
  typeof window.showDirectoryPicker === 'function';

@customElement(TAG_NAME)
export class WirthMageApp extends LitElement {
  static override styles?: CSSResultGroup = css`
    #container {
      display: grid;
      grid-template: 1fr auto auto / minmax(300px, 1fr) auto;
      gap: 3vh 3vw;
      padding: 3vh 3vw;
      width: 100dvw;
      height: 100dvh;
      box-sizing: border-box;
    }
    #error {
      color: #888;
    }
    #images {
      grid-row: 1 / -1;
    }
    #notice {
      margin: auto;
      max-width: 24rem;
      font-size: 0.85em;
      color: #666;
      p {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 0.5em;
      }
      p::before {
        content: '💡';
      }
    }
    #buttons {
      display: flex;
      gap: 0.5em;
    }
    button {
      ${BUTTON_STYLE};
      flex: 1;
      color: #fff;
      font-weight: bold;
      &#execute {
        background: #048;
      }
      &#quit {
        background: #822;
      }
    }
  `;

  private _processor = new ImageProcessorController(this);

  @query('#images')
  imageInput!: ImageInput;

  @query('#setting')
  setting!: ConverterSetting;

  @query('#progress')
  progress?: HTMLDialogElement;

  @state()
  isProcessing: boolean = false;

  @state()
  processedCount: number = 0;

  override connectedCallback(): void {
    super.connectedCallback();

    document.addEventListener('dragover', this.#handleDragOver);
    document.addEventListener('dragleave', this.#handleDragLeave);
    document.addEventListener('drop', this.#handleDrop);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('dragover', this.#handleDragOver);
    document.removeEventListener('dragleave', this.#handleDragLeave);
    document.removeEventListener('drop', this.#handleDrop);
  }

  protected override render(): unknown {
    if (!FILE_SYSTEM_ENABLED) {
      return html`
        <div id="error">
          Microsoft Edge や Google Chrome 等 Chromium 系ブラウザでご利用ください。
        </div>
      `;
    }

    return html`
      <div id="container">
        <image-input
          id="images"
          @update=${() => this.requestUpdate()}
          ?disabled="${this.isProcessing}"
        ></image-input>
        <converter-setting
          id="setting"
          ?disabled="${this.isProcessing}"
        ></converter-setting>
        ${this.#renderProcessing() ?? [this.#renderNotice(), this.#renderButtons()]}
      </div>
    `;
  }

  #renderProcessing(): TemplateResult | null {
    if (!this.isProcessing) {
      this.progress?.close();
      return null;
    }

    this.updateComplete.then(() => {
      if (!this.progress?.open) this.progress?.showModal();
    });

    const total = this.imageInput.files.length;
    const message = this._processor.canceled
      ? '変換を中止します'
      : `進行中... (${this.processedCount}/${total})`;

    return html`
      <dialog id="progress">
        ${message}
        <progress value="${this.processedCount}" max="${total}"></progress>
        <button
          id="cancel"
          @click=${() => this._processor.stopProcessing()}
          ?disabled=${this._processor.canceled}
        >
          中止
        </button>
      </dialog>
    `;
  }

  #renderNotice(): TemplateResult {
    return html`
      <div id="notice">
        ${this.imageInput?.hasSameNames
          ? html`<p>
              同名のファイルが入力されています。重複ファイルはサブフォルダに格納されます。
            </p>`
          : null}
      </div>
    `;
  }

  #renderButtons(): TemplateResult {
    return html`
      <div id="buttons">
        <button
          id="execute"
          @click=${() => this._processor.startProcessing()}
          ?disabled=${this.isProcessing}
        >
          変換
        </button>
        ${APP_MODE_QUERY.matches
          ? html`<button
              id="quit"
              @click=${() => window.close()}
              ?disabled=${this.isProcessing}
            >
              終了
            </button>`
          : null}
      </div>
    `;
  }

  #handleDragOver = (e: DragEvent) => {
    if (this.isProcessing) {
      if (e.dataTransfer?.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'none';
      }
      return;
    }

    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.imageInput.toggleAttribute('dragging', true);
    }
  };

  #handleDragLeave = (e: DragEvent) => {
    if (!e.relatedTarget) {
      this.imageInput.toggleAttribute('dragging', false);
    }
  };

  #handleDrop = (e: DragEvent) => {
    if (this.isProcessing) return;

    if (e.dataTransfer?.types.includes('Files') && !e.defaultPrevented) {
      e.preventDefault();
      e.stopPropagation();
      this.imageInput.toggleAttribute('dragging', false);
      this.imageInput.addFiles(e.dataTransfer.files);
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: WirthMageApp;
  }
}
