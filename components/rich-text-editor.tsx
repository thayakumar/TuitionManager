"use client";
import { useEffect, useId, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
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
}: {
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const id = useId(),
    [html, setHtml] = useState(value ?? defaultValue),
    [linkOpen, setLinkOpen] = useState(false),
    [url, setUrl] = useState(""),
    [linkError, setLinkError] = useState("");
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
    ],
    content: editorHtml(value ?? defaultValue),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const next = editor.getHTML();
      setHtml(next);
      onChange?.(next);
    },
    editorProps: {
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
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (value !== undefined && editor && value !== editor.getHTML()) {
      editor.commands.setContent(editorHtml(value), { emitUpdate: false });
      setHtml(value);
    }
  }, [value, editor]);
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
    <div className={`rich-editor-field min-w-0 ${className}`}>
      {label && (
        <label id={`${id}-label`} className="mb-2 block font-medium">
          {label}
        </label>
      )}
      <div className={`rich-editor ${disabled ? "opacity-70" : ""}`}>
        <div
          role="toolbar"
          aria-label={`${label || "Text"} formatting`}
          className="rich-editor-toolbar"
        >
          <select
            aria-label="Text style"
            disabled={disabled || !editor}
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
                  .setHeading({ level: Number(selected.slice(1)) as 1 | 2 | 3 })
                  .run();
            }}
          >
            <option value="paragraph">Normal text</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          {commands.map((command) => (
            <button
              key={command.label}
              type="button"
              title={command.label}
              aria-label={command.label}
              aria-pressed={command.active ?? false}
              disabled={disabled || !editor}
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
        <EditorContent editor={editor} />
        {!editor && (
          <div className="rich-text-editor-content text-muted-foreground">
            {placeholder}
          </div>
        )}
      </div>
      {name && <input type="hidden" name={name} value={html} />}
    </div>
  );
}
