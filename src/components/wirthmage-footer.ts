import { parseSimpleMarkdown } from "@/utils/markdown";
import { css, type CSSResultGroup, html, LitElement } from "lit";
import { customElement, query } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import README_MD from "../../README.md?raw";

const TAG_NAME = "wirthmage-footer";

const readmeContents = unsafeHTML(parseSimpleMarkdown(README_MD));

@customElement(TAG_NAME)
export class WirthMageFooter extends LitElement {
  static override styles?: CSSResultGroup = css`
    :host {
      display: block;
      color: #488;
      font-size: 0.85rem;
    }
    :is(:link, :visited, button) {
      all: unset;
      cursor: pointer;
      &:is(:hover, :active, :focus-visible) {
        text-decoration: underline;
      }
      &:focus-visible {
        outline-color: #8ff;
      }
    }
    nav {
      position: absolute;
      top: 1rlh;
      right:3dvw;
    }
    address {
      display: flex;
      gap: 1em;
      font: unset;
    }
    dialog {
      box-sizing: border-box;
      font-size: 0.85rem;
      padding: 1rem 1rem 3rem;
      border: 1rem solid #fff;
      background: #fff;
      max-width: min(80dvw, 50em);
      max-height: 80dvh;
      overflow: hidden;
      overflow-y: auto;
      position: relative;
      &::backdrop {
        background: #8888;
        cursor: pointer;
      }
      button.close {
        position: fixed;
        top: 1rlh;
        right: 3dvw;
        color: #fff;
      }
      h1, h2 {
        color: #666;
        &::before {
          color: #888;
          font-size: 1rem;
          font-weight: normal;
        }
      }
      h1 {
        font-size: 1.5rem;
        margin: 1em 0 0;
        &::before {
          content: "#" " ";
        }
      }
      h2 {
        font-size: 1.2rem;
        margin: 2em 0 0;
        &::before {
          content: "##" " ";
        }
      }
    }
  `;

  @query("dialog")
  private _dialog!: HTMLDialogElement;

  protected override render(): unknown {
    const rel = "external noopener noreferrer";
    const address = {
      GitHub: { url: "https://github.com/AzamiHaruCat/WirthMagePWA", rel },
      Fedibird: { url: "https://fedibird.com/@AzamiHaru", rel: `me ${rel}` },
      Wavebox: {
        url: "https://wavebox.me/wave/92d6tplp6lfod4ba/",
        rel: `me ${rel}`,
      },
    };
    const addressLinks = repeat(
      Object.entries(address),
      ([key]) => key,
      ([key, { url, rel }]) =>
        html`
          <a href=${url} rel=${rel} target="_blank">[${key}]</a>
        `,
    );
    return html`
      <footer>
        <nav>
          <button @click=${() => this._dialog.showModal()}>
            [about this app]
          </button>
        </nav>
        <address>
          &copy; 2026 字見明 ${addressLinks}
        </address>
        ${this.#renderDialog()}
      </footer>
    `;
  }

  #renderDialog(): unknown {
    return html`
      <dialog @click=${this.#handleClickDialog}>
        <form method="dialog">
          ${readmeContents}
          <button class="close" title="close">[x]</button>
        </form>
      </dialog>
    `;
  }

  #handleClickDialog = (e: MouseEvent): void => {
    const rect = this._dialog.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this._dialog.close();
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: WirthMageFooter;
  }
}
