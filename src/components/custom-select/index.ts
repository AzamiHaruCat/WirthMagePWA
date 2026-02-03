import { FormInput } from '@/components/abstract/form-input';
import { KeyboardController } from '@/controllers/keyboard-controller';
import { PositionController } from '@/controllers/position-controller';
import { html, type PropertyValues } from 'lit';
import {
  customElement,
  property,
  query,
  queryAssignedElements,
  state,
} from 'lit/decorators.js';
import { STYLE } from './style';
import {
  ACTIVE_SELECTOR,
  getIdOrRandomId,
  getValue,
  IGNORE_SELECTOR,
  SELECTED_SELECTOR,
  SLOTTED_SELECTOR,
} from './utils';

const TAG_NAME = 'custom-select';

@customElement(TAG_NAME)
export class CustomSelect extends FormInput<string> {
  static styles = STYLE;
  static getValue = getValue;

  #valueSet!: Set<string>;
  #lastValues: (string | null)[] = [];

  private _pos = new PositionController(this);
  private _key = new KeyboardController(this);

  @state()
  _placeholder!: string;

  @state()
  _isOpen = false;

  @property({ type: Boolean, reflect: true })
  multiple = false;

  @query('#container')
  containerPart!: HTMLElement;

  @query('#listbox')
  listboxPart!: HTMLElement;

  @query('#label')
  labelPart!: HTMLElement;

  @queryAssignedElements({ slot: 'selected' })
  protected _assignedSelected!: HTMLElement[];

  @queryAssignedElements({ selector: '[aria-selected="true"]' })
  protected _unassignedSelected!: HTMLElement[];

  get allOptions() {
    return Object.freeze(Array.from(this.querySelectorAll(SLOTTED_SELECTOR)));
  }

  get selectedOption() {
    return this.querySelector(SELECTED_SELECTOR);
  }
  get selectedOptions() {
    return Object.freeze(Array.from(this.querySelectorAll(SELECTED_SELECTOR)));
  }

  @property({ attribute: false })
  get activeOption() {
    return this.querySelector(ACTIVE_SELECTOR);
  }
  protected set activeOption(target: Element | null) {
    const currentNode = this.activeOption;
    if (target === currentNode) return;

    if (currentNode) {
      currentNode.toggleAttribute('data-active', false);
    }

    if (target?.parentElement === this) {
      target.toggleAttribute('data-active', true);

      const id = getIdOrRandomId(target);
      this.containerPart.setAttribute('aria-activedescendant', id);
    } else {
      this.containerPart?.removeAttribute('aria-activedescendant');

      if (!currentNode) return;
    }

    this.requestUpdate('activeOption', currentNode);
  }

  constructor() {
    super();

    const kbd = this._key;
    kbd.onEnter = (e) => {
      e.preventDefault();
      this._keyboardEnter();
    };
    kbd.onEscape = () => {
      this._isOpen = false;
    };
    kbd.onArrowDown = (e) => {
      e.preventDefault();
      this._isOpen = true;
      this._keyboardUpDown(1);
    };
    kbd.onArrowUp = (e) => {
      e.preventDefault();
      this._isOpen = true;
      this._keyboardUpDown(-1);
    };

    this.defaultValues = this.allOptions
      .filter((node) => node.matches('[slot="selected"]'))
      .map(getValue);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;

    this.addEventListener('click', this.#toggleOpen);
    this.addEventListener('focusin', this.#handleFocusIn);
    this.addEventListener('focusout', this.#handleFocusOut);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    this.removeEventListener('click', this.#toggleOpen);
    this.removeEventListener('focusin', this.#handleFocusIn);
    this.removeEventListener('focusout', this.#handleFocusOut);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('_isOpen')) {
      if (this._isOpen) {
        this._unassignedSelected.forEach((node) => (node.slot = 'selected'));
      } else {
        this.activeOption = null;
        this._assignedSelected.forEach((node) => node.removeAttribute('slot'));
      }
    }

    if (
      !this.#valueSet ||
      changedProperties.has('value') ||
      changedProperties.has('values')
    ) {
      this.#valueSet = new Set(this.values);
    }
  }

  protected override render(): unknown {
    const label = html`
      <div id="label" part="label">
        <slot name="selected">
          <div id="placeholder">${this._placeholder}</div>
        </slot>
      </div>
    `;

    const listbox = html`
      <div id="listbox" part="listbox" role="listbox" ?hidden="${!this._isOpen}">
        <slot
          @click="${this._clickOption}"
          @slotchange="${this.#updateSlottedElements}"
        ></slot>
      </div>
    `;

    return html`
      <div
        id="container"
        role="combobox"
        aria-expanded="${this._isOpen}"
        aria-haspopup="listbox"
        aria-required="${this.required}"
      >
        ${label} ${listbox}
      </div>
    `;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('_isOpen') ||
      changedProperties.has('value') ||
      changedProperties.has('values')
    ) {
      this.updateComplete.then(() => this.#updateSlottedElements());
    }

    if (this._isOpen && changedProperties.has('_isOpen')) {
      requestAnimationFrame(() => {
        this._pos.update(this.containerPart, this.listboxPart);
        this.#scrollToActiveOption();
      });
    } else if (this._isOpen && changedProperties.has('activeOption')) {
      requestAnimationFrame(() => {
        this.#scrollToActiveOption();
      });
    }
  }

  #toggleOpen(): void {
    this._isOpen = !this._isOpen;
  }

  #choice(): void {
    this._isOpen = this.multiple;
    this._setValue(getValue(this.activeOption));
    this.updateComplete.then(() => {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
  }

  #handleFocusIn(e: FocusEvent): void {
    const previousTarget = e.relatedTarget as Node;
    if (this.contains(previousTarget)) return;

    this.#lastValues = Array.from(this.values);
  }

  #handleFocusOut(e: FocusEvent): void {
    const nextTarget = e.relatedTarget as Node;
    if (this.contains(nextTarget) || this.matches(':has(:active)')) return;

    this._isOpen = false;

    const { values } = this;
    if (
      this.#lastValues.length !== values.length ||
      !this.#lastValues.every((v, i) => v === values[i])
    ) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  protected _setValue(value: string): void {
    if (this.multiple) {
      if (this.#valueSet.has(value)) {
        this.#valueSet.delete(value);
      } else {
        this.#valueSet.add(value);
      }
      const allValues = this.allOptions.map(getValue);
      this.values = allValues.filter((v) => this.#valueSet.has(v));
    } else {
      this.value = value;
    }
  }

  protected _clickOption(e: MouseEvent): void {
    const eventTarget = e.composedPath()[0] as Element;
    const node = eventTarget.closest(`${this.localName} > [role="option"]`);
    this.activeOption = node;
    if (!node) return;

    // 親clickへの伝播を止める
    e.stopPropagation();
    this.#choice();
  }

  protected _keyboardEnter(): void {
    if (this.activeOption) {
      this.#choice();
    } else {
      this.#toggleOpen();
    }
  }

  protected _keyboardUpDown(direction: 1 | -1): void {
    if (!this._isOpen) return;

    const nodes = this.allOptions.filter((n) => !n.matches(IGNORE_SELECTOR));
    if (nodes.length === 0) return;

    const currentNode = this.activeOption;
    if (!currentNode) {
      this.activeOption = (!this.multiple && this.selectedOption) || nodes[0]!;
      return;
    }

    const currentIndex = nodes.findIndex((node) => node === currentNode);
    let nextIndex = (currentIndex + direction + nodes.length) % nodes.length;

    while (nodes[nextIndex]?.matches(IGNORE_SELECTOR)) {
      nextIndex += direction;
      if (nextIndex === nodes.length) nextIndex = 0;
    }
    nextIndex = Math.max(0, Math.min(nextIndex, nodes.length - 1));

    this.activeOption = nodes[nextIndex]!;
  }

  #updatePlaceholder(): void {
    this._placeholder =
      this.selectedOptions
        .filter((node) => !node.matches(IGNORE_SELECTOR))
        .map((node) => node.textContent.trim())
        .join(' ') ||
      (this.placeholder ?? 'Select');
  }

  #updateSlottedElements(): void {
    this.updateComplete.then(() => this.#updatePlaceholder());

    this.allOptions.forEach((node) => {
      if (!node.hasAttribute('role')) {
        node.setAttribute('role', 'option');
      }

      if (!node.hasAttribute('value')) {
        node.setAttribute('value', getValue(node));
      }

      const ignored = node.matches(IGNORE_SELECTOR);
      const selected = !ignored && this.#valueSet.has(getValue(node));

      node.setAttribute('aria-selected', String(selected));

      if (selected && !this._isOpen) {
        node.slot = 'selected';
      } else if (node.slot) {
        node.removeAttribute('slot');
      }
    });
  }

  #scrollToActiveOption(): void {
    if (!this._isOpen) return;

    const currentNode = this.activeOption || (!this.multiple && this.selectedOption);
    if (!currentNode) return;

    this.activeOption = currentNode;

    const listbox = this.listboxPart;
    const listboxRect = listbox.getBoundingClientRect();
    const optionRect = currentNode.getBoundingClientRect();

    const optionCenterInContent =
      optionRect.top + optionRect.height / 2 - listboxRect.top + listbox.scrollTop;

    const targetScroll = optionCenterInContent - listboxRect.height / 2;

    listbox.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: CustomSelect;
  }
}
