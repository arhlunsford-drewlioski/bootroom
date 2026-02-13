import { useState } from 'react';
import type { SessionNote } from '../db/database';
import { TACTICAL_TAGS } from '../constants/tags';
import Input from './ui/Input';

interface SessionNotesProps {
  notes: SessionNote[];
  onChange: (notes: SessionNote[]) => void;
  sessionStartTime?: string; // HH:MM format
}

function getElapsedTimestamp(sessionStartTime: string | undefined): string {
  if (!sessionStartTime) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  const [startH, startM] = sessionStartTime.split(':').map(Number);
  const now = new Date();
  const startMinutes = startH * 60 + startM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const elapsed = Math.max(0, nowMinutes - startMinutes);
  const mins = Math.floor(elapsed);
  const secs = now.getSeconds();
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function SessionNotes({ notes, onChange, sessionStartTime }: SessionNotesProps) {
  const [noteText, setNoteText] = useState('');

  function addNote(text: string, tags?: string[]) {
    const timestamp = getElapsedTimestamp(sessionStartTime);
    const newNote: SessionNote = {
      text: text.trim(),
      timestamp,
      tags: tags && tags.length > 0 ? tags : undefined,
    };
    onChange([...notes, newNote]);
    setNoteText('');
  }

  function addQuickTag(tag: string) {
    addNote(tag, [tag]);
  }

  function removeNote(index: number) {
    onChange(notes.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="block text-xs font-medium text-txt-muted mb-2">Session Notes</label>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
          {notes.map((note, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded bg-surface-2 border border-surface-5 group"
            >
              <span className="text-[10px] text-accent font-mono mt-0.5 shrink-0">
                [{note.timestamp}]
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-txt">{note.text}</span>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {note.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0 rounded text-[9px] font-medium bg-accent/10 text-accent/70">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeNote(i)}
                className="text-txt-faint hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Note input */}
      <div className="flex gap-2">
        <Input
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note..."
          onKeyDown={e => {
            if (e.key === 'Enter' && noteText.trim()) {
              e.preventDefault();
              addNote(noteText);
            }
          }}
        />
        <button
          type="button"
          onClick={() => { if (noteText.trim()) addNote(noteText); }}
          disabled={!noteText.trim()}
          className="h-9 px-3 rounded-md text-sm bg-accent text-surface-1 font-medium hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Add
        </button>
      </div>

      {/* Quick tactical tags */}
      <div className="mt-2">
        <label className="block text-[10px] font-medium text-txt-faint mb-1.5">Quick Tags</label>
        <div className="flex flex-wrap gap-1">
          {TACTICAL_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => addQuickTag(tag)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-3 text-txt-muted border border-surface-5 hover:bg-surface-4 hover:text-txt transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
