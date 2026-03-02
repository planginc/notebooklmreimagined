'use client';

import { Note as NoteIcon } from '@phosphor-icons/react';
import { ArrowLeft, Loader2, Plus, Trash2, Pin, PinOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface NoteItem {
  id: string;
  notebook_id: string;
  type: 'written' | 'saved_response';
  title: string | null;
  content: string | null;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NotesPanelProps {
  notes: NoteItem[];
  notebookId: string;
  onSave: (noteId: string, title: string, content: string) => Promise<void>;
  onCreate: (title: string, content: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onTogglePin: (noteId: string, isPinned: boolean) => Promise<void>;
  onClose?: () => void;
}

export function NotesPanel({
  notes,
  notebookId,
  onSave,
  onCreate,
  onDelete,
  onTogglePin,
  onClose,
}: NotesPanelProps) {
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false);

  const openNote = (note: NoteItem) => {
    setSelectedNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setIsNewNote(false);
  };

  const startNewNote = () => {
    setSelectedNote(null);
    setEditTitle('');
    setEditContent('');
    setIsNewNote(true);
  };

  const backToList = () => {
    setSelectedNote(null);
    setIsNewNote(false);
  };

  const handleSave = async () => {
    if (!editTitle.trim() && !editContent.trim()) return;
    setSaving(true);
    try {
      if (isNewNote) {
        await onCreate(editTitle, editContent);
        setIsNewNote(false);
      } else if (selectedNote) {
        await onSave(selectedNote.id, editTitle, editContent);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    setDeleting(true);
    try {
      await onDelete(selectedNote.id);
      backToList();
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Editor view (editing existing note or creating new)
  if (selectedNote || isNewNote) {
    return (
      <div className="flex h-full flex-col">
        {/* Editor Header */}
        <div className="flex items-center gap-2 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={backToList}
            className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          {selectedNote && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePin(selectedNote.id, !selectedNote.is_pinned)}
                className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title={selectedNote.is_pinned ? 'Unpin note' : 'Pin note'}
              >
                {selectedNote.is_pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {/* Title Input */}
        <div className="space-y-2 pb-3">
          <Input
            placeholder="Note title..."
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-10 rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-lg font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Content Editor */}
        <div className="flex-1 pb-4">
          <Textarea
            placeholder="Write your notes here..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="h-full min-h-[300px] resize-none rounded-lg border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-2 border-t border-[rgba(255,255,255,0.1)] pt-4">
          {selectedNote && (
            <span className="text-xs text-[var(--text-tertiary)]">
              Last edited {formatDate(selectedNote.updated_at)}
            </span>
          )}
          <div className="flex-1" />
          <Button
            onClick={handleSave}
            disabled={saving || (!editTitle.trim() && !editContent.trim())}
            className="rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isNewNote ? 'Create Note' : 'Save Changes'}
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex h-full flex-col">
      {/* New Note Button */}
      <div className="pb-4">
        <Button
          onClick={startNewNote}
          variant="outline"
          className="w-full rounded-lg border-dashed border-[rgba(255,255,255,0.15)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <NoteIcon className="mb-3 h-10 w-10 text-[var(--text-tertiary)]" weight="duotone" />
          <p className="text-sm text-[var(--text-secondary)]">No notes yet</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            Create a note to start organizing your thoughts
          </p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note)}
              className="group w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[var(--bg-tertiary)] p-3 text-left transition-colors hover:border-[rgba(255,255,255,0.15)] hover:bg-[var(--bg-tertiary)]/80"
            >
              <div className="flex items-start gap-2">
                <NoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" weight="duotone" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {note.title || 'Untitled Note'}
                    </p>
                    {note.is_pinned && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                  </div>
                  {note.content && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-tertiary)]">
                      {note.content}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[var(--text-tertiary)]/60">
                    {formatDate(note.updated_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
