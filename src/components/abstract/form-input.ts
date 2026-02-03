import { LitElement, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';

export abstract class FormInput<T extends string | File = string> extends LitElement {
  static defaultMissingAlert = '必須項目です';

  #values: T[] = [];
  #defaultValues: T[] = [];

  /**
   * フォーム送信時のフィールド名
   */
  @property({ type: String, reflect: true })
  name: string | null = null;

  /**
   * プレースホルダー
   */
  @property({ type: String, reflect: true })
  placeholder: string | null = null;

  /**
   * 必須フラグ
   */
  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: String, attribute: 'data-missing', reflect: true })
  missingAlert: string | null = null;

  /**
   * 無効化フラグ
   */
  @property({ type: Boolean, reflect: true })
  disabled = false;

  /**
   * 単一の値
   */
  @property({ attribute: false })
  get value(): T | null {
    return this.#values[0] ?? null;
  }
  set value(val: T | null) {
    if (this.#values[0] !== val) {
      const oldValues = Array.from(this.#values);
      if (val === null) {
        this.#values = [];
      } else {
        this.#values[0] = val;
      }
      this.requestUpdate('value', oldValues[0]);
      this.requestUpdate('values', oldValues);
    }
  }

  /**
   * 複数の値
   */
  @property({ type: Array, attribute: false })
  get values(): readonly T[] {
    return Object.freeze(Array.from(this.#values));
  }
  set values(val: Iterable<T>) {
    const oldValues = this.#values;
    this.#values = Array.from(val ?? []);
    this.requestUpdate('values', oldValues);
  }

  /**
   * 単一のデフォルト値をvalue属性に紐づけ
   */
  @property({ attribute: 'value', reflect: false })
  get defaultValue(): T | null {
    return this.#defaultValues[0] ?? null;
  }
  set defaultValue(val: T | null) {
    if (val === null) {
      this.#defaultValues = [];
    } else {
      this.#defaultValues[0] = val;
    }
  }

  /**
   * 複数のデフォルト値
   */
  @property({ type: Array, attribute: false })
  get defaultValues(): readonly T[] {
    return Object.freeze(Array.from(this.#defaultValues));
  }
  set defaultValues(val: Iterable<T>) {
    this.#defaultValues = Array.from(val ?? []);
  }

  /**
   * resetイベントに対応
   */
  formResetCallback(): void {
    this.values = Array.from(this.defaultValues);
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (
      changedProperties.has('name') ||
      changedProperties.has('value') ||
      changedProperties.has('values')
    ) {
      this.updateFormValue();
    }

    if (
      changedProperties.has('required') ||
      changedProperties.has('missingAlert') ||
      changedProperties.has('value') ||
      changedProperties.has('values')
    ) {
      this.updateValidity();
    }
  }

  protected override firstUpdated(changedProperties: PropertyValues<this>): void {
    super.firstUpdated(changedProperties);

    if (this.#values.length === 0 && this.#defaultValues.length > 0) {
      this.updateComplete.then(() => this.formResetCallback());
    }
  }

  /**
   * 入力要素として振る舞う
   */
  static formAssociated = true;
  #internals = this.attachInternals();

  protected get _internals(): ElementInternals {
    return this.#internals;
  }

  /**
   * フォームデータを更新する
   */
  updateFormValue(): void {
    if (!this.name || this.disabled) {
      this.#internals.setFormValue(null);
      return;
    }

    if (this.values.length < 2) {
      this.#internals.setFormValue(this.value);
    } else {
      const data = new FormData();
      this.values.forEach((v) => data.append(this.name!, v));
      this.#internals.setFormValue(data);
    }
  }

  /**
   * バリデーション状態を更新する
   */
  updateValidity(): void {
    this._validate({
      valueMissing:
        this.required && (this.values.length === 0 || this.values.every((v) => !v)),
    });
  }

  protected _validate(flags: ValidityStateFlags): void {
    const message = flags.valueMissing
      ? this.missingAlert || (this.constructor as typeof FormInput).defaultMissingAlert
      : '';
    this.#internals.setValidity(flags, message);
  }
}
