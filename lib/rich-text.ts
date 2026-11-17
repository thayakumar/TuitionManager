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
      "img",
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
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    allowedStyles: { "*": { "text-align": [/^(left|center|right|justify)$/] } },
    transformTags: {
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          src: safeInlineImage(attribs.src || "") || "",
          loading: "lazy",
        },
      }),
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !safeInlineImage(frame.attribs.src || ""),
  });
}
/** Only authenticated image endpoints and ordinary HTTPS images can be embedded. */
export function safeInlineImage(value: string): string | null {
  if (/^\/api\/files\/[A-Za-z0-9_-]+(?:\?inline=1)?$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
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
  if (richTextPlainText(value).trim()) return true;
  return (
    !!value && /<img\b[^>]*\bsrc=["'][^"']+["']/i.test(sanitizeRichText(value))
  );
}

function trimUrlPunctuation(value: string): string {
  let url = value.replace(/[.,;!?:]+$/g, "");
  for (const [open, close] of [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ]) {
    while (
      url.endsWith(close) &&
      url.split(close).length > url.split(open).length
    )
      url = url.slice(0, -1);
  }
  return url;
}
function autoLinkText(text: string): string {
  return text.replace(/\b(?:https?:\/\/|www\.)[^\s<>]+/giu, (raw) => {
    const candidate = trimUrlPunctuation(raw);
    const decoded = candidate
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    try {
      const url = new URL(
        /^www\./i.test(decoded) ? "https://" + decoded : decoded,
      );
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname ||
        url.username ||
        url.password
      )
        return raw;
      return (
        '<a href="' +
        escapeRichText(url.href) +
        '" target="_blank" rel="noopener noreferrer">' +
        candidate +
        "</a>" +
        raw.slice(candidate.length)
      );
    } catch {
      return raw;
    }
  });
}
/** Link text nodes only; existing links and code blocks retain their exact meaning. */
function autoLinkHtml(html: string): string {
  const protectedTags: string[] = [];
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (part.startsWith("<")) {
        const closing = /^<\/(a|pre|code)\b/i.exec(part);
        const opening = /^<(a|pre|code)\b/i.exec(part);
        if (closing) protectedTags.pop();
        else if (opening) protectedTags.push(opening[1].toLowerCase());
        return part;
      }
      return protectedTags.length ? part : autoLinkText(part);
    })
    .join("");
}
export function richTextHtml(value: string): string {
  return autoLinkHtml(
    isRichText(value)
      ? sanitizeRichText(value)
      : escapeRichText(value).replace(/\n/g, "<br>"),
  );
}
