import { richTextHtml } from "@/lib/rich-text";
export function RichText({
  content,
  className = "",
}: {
  content: string | null | undefined;
  className?: string;
}) {
  if (!content) return null;
  return (
    <div
      className={`rich-text min-w-0 break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: richTextHtml(content) }}
    />
  );
}
