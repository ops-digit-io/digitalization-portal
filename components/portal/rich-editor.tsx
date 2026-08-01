"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { useEffect } from "react";
import { useI18n } from "@/components/providers";

/**
 * A rich-text (WYSIWYG) editor over markdown. The user formats text with a
 * toolbar and never sees markdown syntax; the value is stored as markdown so it
 * stays a readable, git-diffable file. `docKey` identifies the document so the
 * editor resets when the user switches files.
 */

function Btn({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`grid h-8 min-w-8 place-items-center rounded px-1.5 text-sm ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      <Btn title={t("editor.heading2", "Heading 2")} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn title={t("editor.heading3", "Heading 3")} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title={t("editor.bold", "Bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><span className="font-bold">B</span></Btn>
      <Btn title={t("editor.italic", "Italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><span className="italic">I</span></Btn>
      <Btn title={t("editor.inlineCode", "Inline code")} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>{"</>"}</Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title={t("editor.bulletList", "Bullet list")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</Btn>
      <Btn title={t("editor.numberedList", "Numbered list")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</Btn>
      <Btn title={t("editor.quote", "Quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
      <Btn title={t("editor.codeBlock", "Code block")} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{"{ }"}</Btn>
      <span className="mx-1 h-5 w-px bg-border" />
      <Btn title={t("editor.link", "Link")} active={editor.isActive("link")} onClick={() => {
        const url = window.prompt(t("editor.linkUrl", "Link URL"));
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        else editor.chain().focus().unsetLink().run();
      }}>🔗</Btn>
      <Btn title={t("editor.undo", "Undo")} onClick={() => editor.chain().focus().undo().run()}>↺</Btn>
      <Btn title={t("editor.redo", "Redo")} onClick={() => editor.chain().focus().redo().run()}>↻</Btn>
    </div>
  );
}

export function RichEditor({ value, onChange, docKey }: { value: string; onChange: (md: string) => void; docKey: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // Preserve relative reference links (references/…); the default validator
      // rejects non-http(s) URLs and would strip them on the markdown round-trip.
      Link.configure({ openOnClick: false, autolink: false, validate: () => true }),
      Markdown.configure({ html: false, linkify: false }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-portal min-h-[320px] max-w-none px-4 py-3 text-sm focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
  });

  // Reset the document when the user switches files.
  useEffect(() => {
    if (editor) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, editor]);

  if (!editor) return <div className="min-h-[360px] rounded-md border" />;

  return (
    <div className="rounded-md border">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
