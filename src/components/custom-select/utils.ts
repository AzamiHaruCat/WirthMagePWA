export const SLOTTED_SELECTOR = `:scope > :is(:not([slot]), [slot="selected"])`;
export const OPTION_SELECTOR = `${SLOTTED_SELECTOR}[role="option"]`;
export const IGNORE_SELECTOR = `:is([hidden], [aria-disabled="true"])`;
export const SELECTED_SELECTOR = `${OPTION_SELECTOR}[aria-selected="true"]`;

export const ACTIVE_SELECTOR = `${OPTION_SELECTOR}[data-active]`;

export const getValue = (node?: Element | null) =>
  (node?.getAttribute('value') ?? node?.textContent)?.trim() ?? '';

export const getIdOrRandomId = (node: Element) => {
  let id = node.id;
  if (!id) {
    const rootNode = node.getRootNode() as Document | ShadowRoot;
    do {
      id = `noid-${Math.random().toString(36).slice(2, 9)}`;
    } while (rootNode.querySelector(`#${id}`));
    node.id = id;
  }
  return id;
};
