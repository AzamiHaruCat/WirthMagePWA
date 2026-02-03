import { css } from 'lit';

export const STYLE = css`
  :host {
    display: inline-block;
    font-size: medium;
    width: 8em;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 1px;
    user-select: none;
    cursor: pointer;
  }
  :host([disabled]) {
    color: #888;
    background-color: #f8f8f8;
    text-decoration: line-through;
    text-decoration-skip-ink: none;
    &,
    * {
      pointer-events: none;
      user-select: none;
      cursor: default;
    }
  }
  * {
    border-color: inherit;
  }
  #container {
    position: relative;
  }
  #label {
    padding: 0.2em 0.4em;
    white-space: nowrap;
    text-overflow: ellipsis;
    contain: paint;
  }
  #placeholder {
    color: color-mix(in srgb, currentColor, transparent);
  }
  #listbox {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    min-width: max-content;
    max-height: 50dvh;
    overflow-x: hidden;
    overflow-y: auto;
    background: #fff;
    border: 1px solid;
    border-color: inherit;
    z-index: 10;

    [role='option'] {
      color: color-mix(in srgb, currentColor, transparent);
    }
  }
  #listbox[data-top] {
    top: auto;
    bottom: 100%;
  }
  ::slotted(:is(*, #_)) {
    display: block;
    padding: 0 0.2em;
    color: currentColor;
  }
  ::slotted(:is([slot='selected'], #_)) {
    display: inline;
    padding: 0;
    &::after {
      content: ' ';
    }
  }
  ::slotted(:is([data-active], #_)) {
    background-color: #ccc8;
  }
  ::slotted(:is([aria-selected='true']:not([slot]), #_)) {
    font-weight: bold;
    color: var(--bold-color);
  }
  [role='option']:hover,
  ::slotted(:is([aria-selected='false']:hover, #_)) {
    text-decoration: underline;
    text-shadow: 0 0 2px #ff08;
    filter: sepia(50%) hue-rotate(-30deg) saturate(500%);
  }
`;
