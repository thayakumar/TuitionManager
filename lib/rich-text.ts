import sanitizeHtml from "sanitize-html";

const richMarkup =
  /<\/?(?:p|div|br|h[1-6]|strong|b|em|i|u|s|del|ul|ol|li|a|blockquote|pre|code|span|mark|hr|script|style|iframe|img|svg|table)\b/i;
export function isRichText(value: string): boolean {
  return richMarkup.test(value);
}
export function escapeRichText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
export function sanitizeRichText(value: string): string {
  if (!isRichText(value)) return value;
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "div",
      "br",
      "h1",
      "h2",
      "h3",
      "h4",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "pre",
      "code",
      "span",
      "mark",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      p: ["style"],
      div: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      h4: ["style"],
      ol: ["start"],
      code: ["class"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}
export function richTextPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (!isRichText(value)) return value;
  return sanitizeHtml(
    value
      .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, " "),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u200b/g, "")
    .trim();
}
export function hasRichTextContent(value: string | null | undefined): boolean {
  return !!richTextPlainText(value).trim();
}
export function richTextHtml(value: string): string {
  if (isRichText(value)) return sanitizeRichText(value);
  return escapeRichText(value)
    .replace(/https?:\/\/[^\s<>]+/g, (raw) => {
      const url = raw.replace(/[.,;!?)]+$/g, "");
      const tail = raw.slice(url.length);
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${tail}`;
    })
    .replace(/\n/g, "<br>");
}
