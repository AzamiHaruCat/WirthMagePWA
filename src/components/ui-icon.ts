import { css, LitElement, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const TAG_NAME = 'ui-icon';

const STYLE = css`
  :host {
    display: inline-flex;
    vertical-align: middle;
    width: 1.5em;
    height: 1.5em;
  }
  svg {
    vertical-align: top;
    flex: 1;
    place-self: center;
    justify-self: stretch;
    fill: currentColor;
  }
`;

type PathAttr = {
  d: string;
  fill?: string;
  transform?: string;
};

const PATH_ATTRS = new (class PathAttrs {
  arrowhead: PathAttr = { d: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z' };
  'arrow-up': PathAttr = this.arrowhead;
  'arrow-down': PathAttr = { ...this.arrowhead, transform: 'rotate(180 12 12)' };
  'arrow-left': PathAttr = { ...this.arrowhead, transform: 'rotate(-90 12 12)' };
  'arrow-right': PathAttr = { ...this.arrowhead, transform: 'rotate(90 12 12)' };

  close: PathAttr = {
    d: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  };

  swap: PathAttr = {
    d: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
  };
  'swap-vertical': PathAttr = this.swap;
  'swap-horizontal': PathAttr = { ...this.swap, transform: 'rotate(90 12 12)' };

  error: PathAttr = {
    d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    fill: '#ff4444',
  };
})();

export type UIIconType = keyof typeof PATH_ATTRS;

@customElement(TAG_NAME)
export class UIIcon extends LitElement {
  static styles = STYLE;

  @property({ reflect: true })
  type!: UIIconType;

  protected override render(): unknown {
    const key = this.type in PATH_ATTRS ? this.type : 'error';
    const { d, transform, fill } = PATH_ATTRS[key];
    return svg`<svg viewBox="0 0 24 24" role="presentation">
      <path d="${d}" transform="${transform ?? null}" fill="${fill ?? null}" />
    </svg>`;
  }

  protected override firstUpdated(): void {
    this.setAttribute('role', 'presentation');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: UIIcon;
  }
}
