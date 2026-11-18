"use client";
import { useEffect, useRef, useState } from "react";
import { richTextHtml } from "@/lib/rich-text";
import { attachmentHref } from "@/lib/attachment-url";
import { ImagePreviewDialog } from "@/components/attachment-preview";
export function RichText({
  content,
  className = "",
}: {
  content: string | null | undefined;
  className?: string;
}) {
  const [image, setImage] = useState<{
    src: string;
    title: string;
    download: string | null;
  } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll("img").forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute(
        "aria-label",
        "Expand image: " + (image.alt || image.title || "Image"),
      );
    });
  });
  if (!content) return null;
  function openImage(target: HTMLImageElement) {
    const src = target.getAttribute("src");
    if (!src) return;
    const inline = attachmentHref(src, true) || src;
    setImage({
      src: inline,
      title: target.alt || target.title || "Image",
      download: attachmentHref(src),
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
        dangerouslySetInnerHTML={{ __html: richTextHtml(content) }}
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
