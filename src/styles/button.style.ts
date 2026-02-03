import { css } from 'lit';

export const BUTTON_STYLE = css`
  & {
    all: unset;
    display: inline-flex;
    place-items: center;
    place-content: center;
    border: 1px solid #ccc;
    border-radius: 4px / 50%;
    background: #4cc;
    color: #fff;
    font-weight: bold;
    padding: 0.5em;
    user-select: none;
    cursor: pointer;
  }
  &:is(:hover, :active, :focus-visible, :has(:hover, :active, :focus-visible), #_) {
    background: #088;
  }
  &:is(:disabled, :host([disabled]) &, #_) {
    cursor: default;
    color: #eee;
    background: #8cc;
    text-decoration: line-through;
    text-decoration-skip: none;
  }
  &:is(:focus-visible, :has(:focus-visible)) {
    outline: 2px solid #8ff;
    outline-offset: 2px;
  }
`;
