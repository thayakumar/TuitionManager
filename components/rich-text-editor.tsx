"use client";
import { useEffect, useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { uploadFile } from "@/lib/upload-client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Unlink,
  Quote,
  Code,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  RemoveFormatting,
  Minus,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { escapeRichText, isRichText, sanitizeRichText } from "@/lib/rich-text";
function editorHtml(value: string) {
  return isRichText(value)
    ? sanitizeRichText(value)
    : value
        .split(/\n/)
        .map((line) => `<p>${escapeRichText(line)}</p>`)
        .join("");
}
export function RichTextEditor({
  name,
  label,
  value,
  onChange,
  defaultValue = "",
  disabled = false,
  placeholder = "Write here…",
  className = "",
  onBusyChange,
  onUploadErrorChange,
  compact = false,
  uploadRole,
  parentToken,
  onSend,
}: {
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onBusyChange?: (busy: boolean) => void;
  onUploadErrorChange?: (blocked: boolean) => void;
  compact?: boolean;
  uploadRole?: "admin" | "student" | "parent";
  parentToken?: string;
  onSend?: () => void;
}) {
  const id = useId(),
    [html, setHtml] = useState(value ?? defaultValue),
    [linkOpen, setLinkOpen] = useState(false),
    [url, setUrl] = useState(""),
    [linkError, setLinkError] = useState(""),
    [imageBusy, setImageBusy] = useState(false),
    [imageError, setImageError] = useState(""),
    [imageWarning, setImageWarning] = useState(""),
    [imageProgress, setImageProgress] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageUploading = useRef(false);
  const failedImages = useRef<File[]>([]);
  const locked = disabled || imageBusy;
  const sendState = useRef({ onSend, locked });
  sendState.current = { onSend, locked };
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { loading: "lazy" },
      }),
    ],
    content: editorHtml(value ?? defaultValue),
    editable: !locked,
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (!sendState.current.onSend || event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || view.composing || event.keyCode === 229) return false;
        event.preventDefault();
        if (!sendState.current.locked) sendState.current.onSend();
        return true;
      },
      handlePaste: (_view, event) => {
        const images = Array.from(event.clipboardData?.files || []).filter(
          (file) => file.type.startsWith("image/"),
        );
        if (!images.length) return false;
        event.preventDefault();
        void insertImages(images);
        return true;
      },
      handleDrop: (_view, event) => {
        const images = Array.from(event.dataTransfer?.files || []).filter(
          (file) => file.type.startsWith("image/"),
        );
        if (!images.length) return false;
        event.preventDefault();
        void insertImages(images);
        return true;
      },
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label || "Rich text content",
        "data-placeholder": placeholder,
        class: "rich-text-editor-content rich-text",
      },
    },
  });
  useEditorState({ editor, selector: (ctx) => ctx.editor?.state });
  useEffect(() => {
    editor?.setEditable(!locked, false);
  }, [editor, locked]);
  useEffect(() => {
    if (value !== undefined && editor && value !== editor.getHTML()) {
      editor.commands.setContent(editorHtml(value), { emitUpdate: false });
      setHtml(value);
    }
  }, [value, editor]);
  async function insertImages(files: File[]) {
    if (!editor || disabled || imageUploading.current || !files.length) return;
    imageUploading.current = true;
    setImageBusy(true);
    setImageError("");
    setImageWarning("");
    setImageProgress(0);
    onBusyChange?.(true);
    let remaining = [...files];
    try {
      for (const file of files) {
        const uploaded = await uploadFile(file, {
          role: uploadRole,
          parentToken,
          onProgress: (progress) => setImageProgress(progress),
        });
        const src = uploaded.inlineUrl || uploaded.fileUrl;
        editor
          .chain()
          .focus()
          .setImage({ src, alt: uploaded.fileName || file.name })
          .run();
        if (uploaded.warning) setImageWarning(uploaded.warning);
        remaining = remaining.slice(1);
      }
      failedImages.current = [];
      onUploadErrorChange?.(false);
    } catch (reason) {
      failedImages.current = remaining;
      onUploadErrorChange?.(true);
      setImageError(
        reason instanceof Error
          ? reason.message
          : "Could not add the image. Your text is still here; try the image again.",
      );
    } finally {
      imageUploading.current = false;
      setImageBusy(false);
      onBusyChange?.(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  function applyLink() {
    try {
      const next = new URL(url);
      if (
        !["http:", "https:", "mailto:"].includes(next.protocol) ||
        next.username ||
        next.password
      )
        throw Error();
      if (editor?.state.selection.empty && !editor.isActive("link")) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: next.href,
            marks: [{ type: "link", attrs: { href: next.href } }],
          })
          .run();
      } else {
        editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: next.href })
          .run();
      }
      setLinkOpen(false);
      setLinkError("");
    } catch {
      setLinkError("Enter a complete http, https or email link.");
    }
  }
  const commands = [
    {
      label: "Bold",
      icon: Bold,
      active: editor?.isActive("bold"),
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor?.isActive("italic"),
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      active: editor?.isActive("underline"),
      run: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strikethrough",
      icon: Strikethrough,
      active: editor?.isActive("strike"),
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: "Highlight",
      icon: Highlighter,
      active: editor?.isActive("highlight"),
      run: () => editor?.chain().focus().toggleHighlight().run(),
    },
    {
      label: "Bullet list",
      icon: List,
      active: editor?.isActive("bulletList"),
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: editor?.isActive("orderedList"),
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: editor?.isActive("blockquote"),
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code block",
      icon: Code,
      active: editor?.isActive("codeBlock"),
      run: () => editor?.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: "Insert link",
      icon: Link2,
      active: editor?.isActive("link"),
      run: () => {
        setUrl(editor?.getAttributes("link").href || "");
        setLinkOpen(!linkOpen);
        setLinkError("");
      },
    },
    {
      label: "Remove link",
      icon: Unlink,
      run: () => editor?.chain().focus().unsetLink().run(),
    },
    {
      label: "Align left",
      icon: AlignLeft,
      run: () => editor?.chain().focus().setTextAlign("left").run(),
    },
    {
      label: "Align center",
      icon: AlignCenter,
      run: () => editor?.chain().focus().setTextAlign("center").run(),
    },
    {
      label: "Align right",
      icon: AlignRight,
      run: () => editor?.chain().focus().setTextAlign("right").run(),
    },
    {
      label: "Divider",
      icon: Minus,
      run: () => editor?.chain().focus().setHorizontalRule().run(),
    },
    {
      label: "Clear formatting",
      icon: RemoveFormatting,
      run: () => editor?.chain().focus().clearNodes().unsetAllMarks().run(),
    },
    {
      label: "Undo",
      icon: Undo2,
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      run: () => editor?.chain().focus().redo().run(),
    },
  ];
  return (
    <div
      className={`rich-editor-field min-w-0 ${compact ? "rich-editor-compact" : ""} ${className}`}
    >
      {label && (
        <label id={`${id}-label`} className="mb-2 block font-medium">
          {label}
        </label>
      )}
      <div className={`rich-editor ${locked ? "opacity-70" : ""}`}>
        <div
          role="toolbar"
          aria-label={`${label || "Text"} formatting`}
          className="rich-editor-toolbar"
        >
          {!compact && (
            <select
              aria-label="Text style"
              disabled={locked || !editor}
              value={
                editor?.isActive("heading", { level: 1 })
                  ? "h1"
                  : editor?.isActive("heading", { level: 2 })
                    ? "h2"
                    : editor?.isActive("heading", { level: 3 })
                      ? "h3"
                      : "paragraph"
              }
              onChange={(e) => {
                const selected = e.target.value;
                if (selected === "paragraph")
                  editor?.chain().focus().setParagraph().run();
                else
                  editor
                    ?.chain()
                    .focus()
                    .setHeading({
                      level: Number(selected.slice(1)) as 1 | 2 | 3,
                    })
                    .run();
              }}
            >
              <option value="paragraph">Normal text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
          )}
          {!compact && (
            <button
              type="button"
              title="Insert image or paste an image into the text"
              aria-label="Insert image"
              disabled={locked || !editor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => imageInput.current?.click()}
            >
              <ImagePlus size={17} />
            </button>
          )}
          {commands
            .filter(
              (command) =>
                !compact ||
                [
                  "Bold",
                  "Italic",
                  "Underline",
                  "Bullet list",
                  "Insert link",
                  "Clear formatting",
                ].includes(command.label),
            )
            .map((command) => (
              <button
                key={command.label}
                type="button"
                title={command.label}
                aria-label={command.label}
                aria-pressed={command.active ?? false}
                disabled={locked || !editor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={command.run}
              >
                <command.icon size={17} />
              </button>
            ))}
        </div>
        {linkOpen && (
          <div className="rich-editor-link">
            <input
              aria-label="Link address"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              disabled={disabled}
            />
            <button type="button" onClick={applyLink} disabled={disabled}>
              Apply link
            </button>
            <button type="button" onClick={() => setLinkOpen(false)}>
              Cancel
            </button>
            {linkError && <p role="alert">{linkError}</p>}
          </div>
        )}
        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
          multiple
          className="sr-only"
          aria-label="Choose images for text"
          disabled={locked || !editor}
          onChange={(event) =>
            void insertImages(Array.from(event.target.files || []))
          }
        />
        {imageBusy && (
          <p role="status" className="rich-editor-upload">
            <Loader2 size={17} className="animate-spin" /> Uploading image
            {imageProgress ? ` · ${Math.round(imageProgress)}%` : ""}… Keep this
            page open.
          </p>
        )}
        {imageError && (
          <div
            role="alert"
            className="rich-editor-upload rich-editor-upload-error text-destructive"
          >
            <p>{imageError} This image has not been added.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-current px-3 py-2"
                disabled={disabled || imageBusy}
                onClick={() => void insertImages(failedImages.current)}
              >
                Retry image upload
              </button>
              <button
                type="button"
                className="rounded-lg border border-current px-3 py-2"
                disabled={imageBusy}
                onClick={() => {
                  failedImages.current = [];
                  setImageError("");
                  onUploadErrorChange?.(false);
                }}
              >
                Discard failed image
              </button>
            </div>
          </div>
        )}
        {imageWarning && (
          <p role="status" className="rich-editor-upload text-amber-800">
            {imageWarning}
          </p>
        )}
        <EditorContent editor={editor} />
        {!editor && (
          <div className="rich-text-editor-content text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
      {onSend && <p className="px-3 py-2 text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>}
      {name && <input type="hidden" name={name} value={html} />}
    </div>
  );
}
