'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StickyNote, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  position: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  onUpdateNote: (id: string, note: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  currentPosition?: number;
}

export const NotesDialog: React.FC<NotesDialogProps> = ({
  open,
  onOpenChange,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  currentPosition = 0
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    position: currentPosition
  });

  const handleCreateNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    onAddNote({
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      position: newNote.position
    });

    setNewNote({
      title: '',
      content: '',
      position: currentPosition
    });
    setIsCreating(false);
  };

  const handleUpdateNote = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    onUpdateNote(id, {
      updatedAt: new Date()
    });
    setEditingId(null);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(id);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const sortedNotes = [...notes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Reading Notes ({notes.length})
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Add Note Button */}
          {!isCreating && (
            <Button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Add New Note
            </Button>
          )}

          {/* Create Note Form */}
          {isCreating && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="note-title">Note Title</Label>
                  <Input
                    id="note-title"
                    placeholder="Enter note title..."
                    value={newNote.title}
                    onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="note-content">Note Content</Label>
                  <Textarea
                    id="note-content"
                    placeholder="Write your note here..."
                    value={newNote.content}
                    onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCreateNote}
                    disabled={!newNote.title.trim() || !newNote.content.trim()}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Save className="h-3 w-3" />
                    Save Note
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setNewNote({ title: '', content: '', position: currentPosition });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notes List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3">
              {sortedNotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No notes yet</p>
                  <p className="text-sm">Add your first note to get started</p>
                </div>
              ) : (
                sortedNotes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 bg-white">
                    {editingId === note.id ? (
                      <div className="space-y-3">
                        <Input
                          value={note.title}
                          onChange={(e) => onUpdateNote(note.id, { title: e.target.value })}
                          className="font-medium"
                        />
                        <Textarea
                          value={note.content}
                          onChange={(e) => onUpdateNote(note.id, { content: e.target.value })}
                          rows={4}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleUpdateNote(note.id)}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingId(null)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{note.title}</h4>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => setEditingId(note.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteNote(note.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <Badge variant="secondary" className="text-xs">
                            Position: {Math.round(note.position)}%
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span>Created: {formatDate(note.createdAt)}</span>
                            {note.updatedAt && (
                              <span>• Updated: {formatDate(note.updatedAt)}</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
