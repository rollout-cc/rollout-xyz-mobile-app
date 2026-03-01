import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useShareNote, useUnshareNote, useTeamMembers } from "@/hooks/useNotes";
import { Pin, PinOff, Trash2, Share2, ArrowLeft, Check, SquarePen, ChevronDown, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

export function NotesPanel() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: notes = [], isLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const shareNote = useShareNote();
  const unshareNote = useUnshareNote();
  const { data: members = [] } = useTeamMembers();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId), [notes, selectedId]);
  const isOwner = selectedNote?.user_id === user?.id;

  // Auto-select first note when notes load and none is selected
  useEffect(() => {
    if (!selectedId && notes.length > 0 && !isLoading) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId, isLoading]);

  const handleCreate = async () => {
    const result = await createNote.mutateAsync("");
    setSelectedId(result.id);
  };

  const handleContentChange = useCallback(
    (val: string) => {
      if (!selectedId) return;
      updateNote.mutate({ id: selectedId, content: val });
    },
    [selectedId, updateNote]
  );

  const handleTitleBlur = (val: string) => {
    if (!selectedId || !isOwner) return;
    if (val !== selectedNote?.title) {
      updateNote.mutate({ id: selectedId, title: val });
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    deleteNote.mutate(selectedId);
    setSelectedId(null);
    toast.success("Note deleted");
  };

  const handleTogglePin = () => {
    if (!selectedId || !isOwner) return;
    updateNote.mutate({ id: selectedId, is_pinned: !selectedNote?.is_pinned });
  };

  const handleShare = (userId: string) => {
    if (!selectedId) return;
    const alreadyShared = selectedNote?.note_shares?.some((s: any) => s.shared_with === userId);
    if (alreadyShared) {
      const share = selectedNote?.note_shares?.find((s: any) => s.shared_with === userId);
      if (share) unshareNote.mutate({ noteId: selectedId, userId });
    } else {
      shareNote.mutate({ noteId: selectedId, userId });
    }
  };

  const pinnedNotes = notes.filter((n) => n.is_pinned);
  const unpinnedNotes = notes.filter((n) => !n.is_pinned);
  const shareCount = selectedNote?.note_shares?.length || 0;

  // On mobile, show either list or detail
  if (isMobile && selectedId && selectedNote) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 py-2 border-b border-border">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          {isOwner && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePin}>
                {selectedNote.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </Button>
              <SharePopover
                members={members}
                currentUserId={user?.id || ""}
                sharedWith={selectedNote.note_shares || []}
                onToggle={handleShare}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        <NoteEditor
          note={selectedNote}
          isOwner={isOwner}
          onTitleBlur={handleTitleBlur}
          onTitleChange={(v) => selectedId && updateNote.mutate({ id: selectedId, title: v })}
          onContentChange={handleContentChange}
          shareCount={shareCount}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0" style={{ minHeight: "60vh" }}>
      {/* Note list sidebar */}
      <div className={cn(
        "border-r border-border overflow-y-auto shrink-0",
        isMobile ? "w-full" : "w-[240px]"
      )}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">Notes</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreate}>
            <SquarePen className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">No notes yet</p>
            <Button size="sm" variant="outline" onClick={handleCreate} className="gap-1">
              <SquarePen className="h-3 w-3" /> New Note
            </Button>
          </div>
        ) : (
          <div>
            {pinnedNotes.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </div>
                {pinnedNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    isSelected={note.id === selectedId}
                    onClick={() => setSelectedId(note.id)}
                    isShared={(note.note_shares?.length || 0) > 0}
                  />
                ))}
              </>
            )}
            {unpinnedNotes.length > 0 && pinnedNotes.length > 0 && (
              <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Recent
              </div>
            )}
            {unpinnedNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedId}
                onClick={() => setSelectedId(note.id)}
                isShared={(note.note_shares?.length || 0) > 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Note detail */}
      {!isMobile && (
        <div className="flex-1 flex flex-col min-w-0">
          {selectedNote ? (
            <>
              <div className="flex items-center justify-end gap-1 px-3 py-1.5 border-b border-border">
                {isOwner && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePin}>
                      {selectedNote.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    <SharePopover
                      members={members}
                      currentUserId={user?.id || ""}
                      sharedWith={selectedNote.note_shares || []}
                      onToggle={handleShare}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              <NoteEditor
                note={selectedNote}
                isOwner={isOwner}
                onTitleBlur={handleTitleBlur}
                onTitleChange={(v) => selectedId && updateNote.mutate({ id: selectedId, title: v })}
                onContentChange={handleContentChange}
                shareCount={shareCount}
                autoFocus={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a note or create a new one
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Note List Item ────────────────────────────────── */

function NoteListItem({ note, isSelected, onClick, isShared }: {
  note: any;
  isSelected: boolean;
  onClick: () => void;
  isShared: boolean;
}) {
  const preview = (note.content || "").replace(/<[^>]*>/g, "").slice(0, 60);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
        isSelected ? "bg-accent" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-semibold text-foreground truncate">{note.title || "New Note"}</p>
        {isShared && <Share2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-[10px] text-muted-foreground">{format(new Date(note.updated_at), "M/d/yy")}</span>
        {preview && <span className="text-[10px] text-muted-foreground truncate">{preview}</span>}
      </div>
    </button>
  );
}

/* ── Note Editor with Rich Text ────────────────────── */

function NoteEditor({ note, isOwner, onTitleBlur, onTitleChange, onContentChange, shareCount, autoFocus }: {
  note: any;
  isOwner: boolean;
  onTitleBlur: (v: string) => void;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  shareCount: number;
  autoFocus: boolean;
}) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const titleRef = useRef<HTMLInputElement>(null);
  const lastAutoTitleRef = useRef<string>(note.title || "");
  const autoTitle = !note.title || note.title.trim() === "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {},
        orderedList: {},
        blockquote: {},
      }),
      TiptapUnderline,
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: note.content || "",
    editable: isOwner,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[40vh] w-full bg-transparent text-sm text-foreground leading-relaxed outline-none",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_blockquote]:my-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1.5",
          "placeholder:text-muted-foreground/40"
        ),
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      const clean = html === "<p></p>" ? "" : html;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => onContentChange(clean), 600);

      // Auto-title from first 3 words of plain text
      if (autoTitle) {
        const text = e.getText().trim();
        const words = text.split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
        if (words && words !== lastAutoTitleRef.current) {
          lastAutoTitleRef.current = words;
          onTitleChange(words);
        }
      }
    },
  }, [note.id]);

  // Sync editable state
  useEffect(() => {
    if (editor) editor.setEditable(isOwner);
  }, [isOwner, editor]);

  // Auto-focus editor on new notes
  useEffect(() => {
    if (editor && autoFocus && !note.content) {
      setTimeout(() => editor.commands.focus("end"), 50);
    }
  }, [editor, note.id]);

  // Focus editor when selecting a note on desktop too
  useEffect(() => {
    if (editor && isOwner) {
      setTimeout(() => editor.commands.focus("end"), 100);
    }
  }, [note.id, editor, isOwner]);

  const activeBlockLabel = useMemo(() => {
    if (!editor) return "Body";
    if (editor.isActive("heading", { level: 1 })) return "Title";
    if (editor.isActive("heading", { level: 2 })) return "Heading";
    if (editor.isActive("heading", { level: 3 })) return "Subheading";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("bulletList")) return "Bullet List";
    if (editor.isActive("orderedList")) return "Numbered List";
    return "Body";
  }, [editor?.state.selection, editor]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Formatting toolbar */}
      {isOwner && editor && (
        <div className="flex items-center gap-0.5 px-4 sm:px-6 py-1.5 border-b border-border/50">
          {/* Block style dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs font-medium text-muted-foreground px-2">
                {activeBlockLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                <span className="text-2xl font-bold">Title</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <span className="text-lg font-bold">Heading</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <span className="text-base font-semibold">Subheading</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                <span className="text-sm">Body</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List className="h-3.5 w-3.5 mr-2" />
                <span className="text-sm">Bulleted List</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="h-3.5 w-3.5 mr-2" />
                <span className="text-sm">Numbered List</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote className="h-3.5 w-3.5 mr-2" />
                <span className="text-sm">Block Quote</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Inline formatting buttons */}
          <Button
            variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive("bold") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive("italic") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive("underline") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn("h-7 w-7", editor.isActive("strike") && "bg-accent")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(note.updated_at), "MMM d, yyyy 'at' h:mm a")}
            {shareCount > 0 && " — Shared"}
          </span>
        </div>
        <input
          ref={titleRef}
          defaultValue={note.title || ""}
          key={note.id + "-title"}
          onBlur={(e) => onTitleBlur(e.target.value)}
          placeholder="Title"
          readOnly={!isOwner}
          className="w-full text-xl sm:text-2xl font-bold text-foreground bg-transparent outline-none border-none mb-3 placeholder:text-muted-foreground/40"
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/* ── Share Popover ─────────────────────────────────── */

function SharePopover({ members, currentUserId, sharedWith, onToggle }: {
  members: { id: string; name: string; avatar_url: string | null }[];
  currentUserId: string;
  sharedWith: { shared_with: string }[];
  onToggle: (userId: string) => void;
}) {
  const otherMembers = members.filter((m) => m.id !== currentUserId);
  const sharedIds = new Set(sharedWith.map((s) => s.shared_with));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Share with team</p>
        {otherMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No team members to share with</p>
        ) : (
          <div className="space-y-0.5">
            {otherMembers.map((m) => {
              const isShared = sharedIds.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => onToggle(m.id)}
                  className="flex items-center gap-2 w-full rounded-md px-1.5 py-1.5 hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-5 w-5">
                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{m.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{m.name}</span>
                  {isShared && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
