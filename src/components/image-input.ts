import { FormInput } from '@/components/abstract/form-input';
import { BUTTON_STYLE } from '@/styles/button.style';
import { getImageMeta, revokeImageFile, type ImageFile } from '@/utils/image-file';
import { css, html, type CSSResultGroup, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import './image-item';
import type { ImageItem } from './image-item';

const TAG_NAME = 'image-input';

@customElement(TAG_NAME)
export class ImageInput extends FormInput<File> {
  static override styles?: CSSResultGroup = css`
    :host {
      display: block;
      contain: layout;
      gap: 4px 0.5em;
    }
    div[part='container'] {
      display: grid;
      grid-template: auto 1fr / 1fr auto;
      gap: inherit;
      height: 100%;
      border: 4px dashed transparent;
      border-radius: 8px;
      margin: -4px;
      :host([dragging]) & {
        border-color: #8ff;
      }
    }
    input {
      all: unset;
      position: absolute;
      contain: strict;
    }
    button {
      all: unset;
      justify-content: center;
    }
    button,
    label {
      ${BUTTON_STYLE};
    }
    ul,
    li {
      all: unset;
    }
    ul {
      grid-column: 1 / -1;
      display: flex;
      flex-flow: row wrap;
      place-items: start;
      place-content: start;
      gap: inherit;
      overflow: auto;
      border: 1px solid #ccc;
      padding: 8px;
    }
  `;

  @state()
  private _metaData: readonly ImageFile[] = [];

  #updateCount = 0;
  #hasDuplicateNames: boolean = false;

  get files(): readonly ImageFile[] {
    return this._metaData;
  }

  get hasSameNames(): boolean {
    return this.#hasDuplicateNames;
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('value') || changedProperties.has('values')) {
      this.#updateMetaData();
    }
  }

  protected override render(): unknown {
    return html`
      <div
        part="container"
        @dragover=${this.#handleDragOver}
        @dragleave=${this.#handleDragLeave}
        @drop=${this.#handleDrop}
      >
        <label part="button">
          ファイル選択 (${this.values.length}件)
          <input
            type="file"
            accept="image/*"
            multiple
            @change=${this.#handleFileChange}
            ?disabled=${this.disabled}
          />
        </label>
        <button
          @click=${() => (this.values = [])}
          ?disabled=${this.disabled || this.values.length === 0}
        >
          クリア
        </button>
        <ul part="list" @remove=${this.#handleFileRemove}>
          ${repeat(
            this._metaData,
            ({ file }) => `${file.name}-${file.size}-${file.lastModified}`,
            (meta) => html`<li part="item"><image-item .data=${meta}></image-item></li>`,
          )}
        </ul>
      </div>
    `;
  }

  async addFiles(newFiles: File[] | FileList): Promise<void> {
    if (this.disabled) return;

    const filesArray = Array.from(newFiles);
    if (filesArray.length === 0) return;

    const imageFiles = filesArray.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const updatedWithMeta = this.values.map((file, index) => ({ file, index }));

    for (const file of imageFiles) {
      const isDuplicate = this.values.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          f.lastModified === file.lastModified,
      );
      if (!isDuplicate) {
        updatedWithMeta.push({ file, index: updatedWithMeta.length });
      }
    }

    updatedWithMeta.sort((a, b) => {
      const nameDiff = a.file.name.localeCompare(b.file.name);
      if (nameDiff !== 0) return nameDiff;
      return a.index - b.index;
    });

    this.values = updatedWithMeta.map((item) => item.file);
    this.#dispatchChange();
  }

  async #updateMetaData(): Promise<void> {
    const currentCount = ++this.#updateCount;
    const newFiles = new Set(this.values);

    const oldDataMap = new Map<File, ImageFile>(
      this._metaData.map((meta) => [meta.file, meta]),
    );

    const newData: ImageFile[] = [];
    const nameCounts = new Map<string, number>();

    for (const file of this.values) {
      const meta = oldDataMap.get(file) ?? (await getImageMeta(file));
      newData.push(meta);

      const baseName = file.name.replace(/\.\w+$/, '');
      nameCounts.set(baseName, (nameCounts.get(baseName) ?? 0) + 1);
    }

    if (this.#updateCount !== currentCount) {
      for (const meta of newData) {
        if (!oldDataMap.has(meta.file)) revokeImageFile(meta);
      }
      return;
    }

    for (const meta of this._metaData) {
      if (!newFiles.has(meta.file)) revokeImageFile(meta);
    }

    this.#hasDuplicateNames = Array.from(nameCounts.values()).some((count) => count > 1);
    this._metaData = Object.freeze(newData);

    this.dispatchEvent(
      new CustomEvent('update', {
        bubbles: true,
        composed: true,
        detail: newData,
      }),
    );
  }

  #handleDragOver = (e: DragEvent): void => {
    if (this.disabled) return;

    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.toggleAttribute('dragging', true);
    }
  };

  #handleDragLeave = (_e: DragEvent): void => {
    this.toggleAttribute('dragging', false);
  };

  #handleDrop = (e: DragEvent) => {
    if (this.disabled) return;

    if (e.dataTransfer?.types.includes('Files') && !e.defaultPrevented) {
      e.preventDefault();
      e.stopPropagation();
      this.toggleAttribute('dragging', false);
      this.addFiles(e.dataTransfer.files);
    }
  };

  #handleFileChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
      input.value = '';
    }
  };

  #handleFileRemove = (e: CustomEvent): void => {
    e.stopPropagation();
    const item = e.target as ImageItem;
    this.values = this.values.filter((f) => f !== item.data?.file);
    this.#dispatchChange();
  };

  #dispatchChange = (): void => {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { files: this.values },
      }),
    );
  };
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: ImageInput;
  }
}
