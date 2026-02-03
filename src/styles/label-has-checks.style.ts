import { css } from 'lit';

export const LABEL_HAS_CHECKS_STYLE = css`
  input {
    margin: 0;
  }
  & {
    display: inline-flex;
    place-items: center;
    gap: 0.5ch;
    padding: 0 0.5ch;
    width: fit-content;
    user-select: none;
    cursor: pointer;
  }
  &:has(:checked:not(:disabled)) {
    background: linear-gradient(to top, #aea 40%, transparent 40%);
  }
  &:has(:disabled, [disabled]),
  :host([disabled]) & {
    color: #888;
    text-decoration: line-through;
    text-decoration-skip: none;
    cursor: default;
  }
`;
