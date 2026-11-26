"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { richTextHtml, escapeRichText } from "@/lib/rich-text";
import { attachmentHref } from "@/lib/attachment-url";
import { ImagePreviewDialog } from "@/components/attachment-preview";
export function RichText({
  content,
  className = "",
  parentToken,
}: {
  content: string | null | undefined;
  className?: string;
  parentToken?: string;
}) {
  const [image, setImage] = useState<{
    src: string;
    title: string;
    download: string | null;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  function withParent(url: string | null) {
    return url && parentToken && url.startsWith("/api/files/")
      ? url + (url.includes("?") ? "&" : "?") + "parent_token=" + encodeURIComponent(parentToken)
      : url;
  }
  const html = useMemo(() => {
    if (!content) return "";
    const rendered = richTextHtml(content);
    if (!parentToken) return rendered;
    return rendered.replace(
      /(<img\b[^>]*\bsrc=")([^"]+)(")/gi,
      (match, start, src, end) =>
        src.startsWith("/api/files/")
          ? start + escapeRichText(withParent(src.replace(/&amp;/g, "&")) || src) + end
          : match,
    );
  }, [content, parentToken]);
  useEffect(() => {
    if (!html) return;
    root.current?.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src");
      if (src && parentToken && src.startsWith("/api/files/") && !src.includes("parent_token=")) {
        img.setAttribute("src", withParent(src)!);
      }
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute(
        "aria-label",
        "Expand image: " + (img.alt || img.title || "Image"),
      );
    });
  }, [html, parentToken]);
  if (!html) return null;
  function openImage(target: HTMLImageElement) {
    const src = target.getAttribute("src");
    if (!src) return;
    const inline = withParent(attachmentHref(src, true)) || src;
    setImage({
      src: inline,
      title: target.alt || target.title || "Image",
      download: withParent(attachmentHref(src)),
    });
  }
  return (
    <>
      <div
        ref={root}
        className={
          "rich-text min-w-0 break-words [&_img]:cursor-zoom-in " + className
        }
        onClick={(event) => {
          const target = event.target;
          if (target instanceof HTMLImageElement) {
            event.preventDefault();
            openImage(target);
          }
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            event.target instanceof HTMLImageElement
          ) {
            event.preventDefault();
            openImage(event.target);
          }
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <ImagePreviewDialog
        src={image?.src || null}
        title={image?.title || "Image"}
        downloadUrl={image?.download}
        onClose={() => setImage(null)}
      />
    </>
  );
}
