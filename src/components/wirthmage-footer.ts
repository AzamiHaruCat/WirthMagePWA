import { css, html, LitElement, type CSSResultGroup } from 'lit';
import { customElement } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

const TAG_NAME = 'wirthmage-footer';

@customElement(TAG_NAME)
export class WirthMageFooter extends LitElement {
  static override styles?: CSSResultGroup = css`
    :host {
      display: block;
      color: #488;
      font-size: 0.85rem;
    }
    :is(:link, :visited) {
      color: unset;
      text-decoration: unset;
      &:is(:hover, :active, :focus-visible) {
        text-decoration: underline;
      }
      &:focus-visible {
        outline-color: #8ff;
      }
    }
    address {
      display: flex;
      gap: 1em;
      font: unset;
    }
  `;

  protected override render(): unknown {
    const rel = 'external noopener noreferrer';
    const address = {
      GitHub: { url: 'https://github.com/AzamiHaruCat/WirthMagePWA', rel },
      Fedibird: { url: 'https://fedibird.com/@AzamiHaru', rel: `me ${rel}` },
      Wavebox: { url: 'https://wavebox.me/wave/92d6tplp6lfod4ba/', rel: `me ${rel}` },
    };
    return html`
      <footer>
        <address>
          &copy; 2026 字見明
          ${repeat(
            Object.entries(address),
            ([key]) => key,
            ([key, { url, rel }]) => html`
              <a href=${url} rel=${rel} target="_blank">[${key}]</a>
            `,
          )}
        </address>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: WirthMageFooter;
  }
}
