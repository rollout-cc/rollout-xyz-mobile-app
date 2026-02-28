import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write something...",
  className,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[60px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none transition-colors",
          "focus:border-ring focus:ring-1 focus:ring-ring",
          "placeholder:text-muted-foreground/50",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_blockquote]:my-1",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Return empty string if editor only has an empty paragraph
      const clean = html === "<p></p>" ? "" : html;
      onChange?.(clean);
    },
    onBlur: ({ editor }) => {
      const html = editor.getHTML();
      const clean = html === "<p></p>" ? "" : html;
      onBlur?.(clean);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML() && value !== (editor.getHTML() === "<p></p>" ? "" : editor.getHTML())) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return <EditorContent editor={editor} />;
}
