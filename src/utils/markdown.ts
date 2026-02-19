export function parseSimpleMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/&(?!(?:\w+|#(?:[0-9]+|x[0-9a-f]+));)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^(#{1,6}) (.*)$/gm, hN)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[(.*?)\]\((.*?)\)/g, a)
    .replace(/\n\n+/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>")
    .replace(/<br>(<h[1-6]>)/g, "</p>$1")
    .replace(/(<\/h[1-6]>)<br>/g, "$1<p>")
    .replace(/<p>\s*<\/p>|<p>(<h[1-6]>)|(<\/h[1-6]>)<\/p>/g, "$1$2")
    .replace(/(?:<(p|br)>- (?:(?!<\/?p>).)+<\/p>)+/g, ul)
    .replace(/(?:<(p|br)>\d+\. (?:(?!<\/?p>).)+<\/p>)+/g, ol)
    .replace(/(<li>(?:(?!<(\/li|p)>).)+)<\/p>/g, "$1");
}

const externalPattern = new RegExp(
  `^https?://(?!${location.host.replace(/\./g, "\\.")}(?:[/?#]|$))`,
  "i",
);
const a = (_: string, $1: string, $2: string): string =>
  externalPattern.test($2)
    ? `<a href="${$2}" rel="external noopener noreferrer" target="_blank">${$1}</a>`
    : `<a href="${$2}">${$1}</a>`;

const hN = (_: string, $1: string, $2: string): string =>
  `<h${$1.length}>${$2.trim()}</h${$1.length}>`;

const ul = ($0: string): string =>
  `<ul>${
    $0
      .replace(/<br>- /g, "</p><p>- ")
      .replace(/<p>- (.+?)<\/p>/g, "<li>$1</li>")
  }</ul>`;

const ol = ($0: string): string =>
  `<ol>${
    $0
      .replace(/<br>\d+\. /g, "</p><p>1. ")
      .replace(/<p>\d+\. (.+?)<\/p>/g, "<li>$1</li>")
  }</ol>`;
