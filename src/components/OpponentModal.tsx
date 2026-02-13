import { useState, useEffect } from 'react';
import { db } from '../db/database';
import type { Opponent } from '../db/database';
import { OPPONENT_TRAITS } from '../constants/tags';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import TagPicker from './ui/TagPicker';

interface OpponentModalProps {
  open: boolean;
  teamId: number;
  opponent?: Opponent | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (opponent: Opponent) => void;
}

export default function OpponentModal({
  open,
  teamId,
  opponent,
  initialName,
  onClose,
  onSaved,
}: OpponentModalProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [strengths, setStrengths] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (opponent) {
        setName(opponent.name);
        setNotes(opponent.notes ?? '');
        setStrengths(opponent.strengths ?? '');
        setTraits(opponent.traits ?? []);
      } else {
        setName(initialName ?? '');
        setNotes('');
        setStrengths('');
        setTraits([]);
      }
    }
  }, [open, opponent, initialName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const data: Omit<Opponent, 'id'> & { id?: number } = {
        teamId,
        name: name.trim(),
        notes: notes.trim() || undefined,
        strengths: strengths.trim() || undefined,
        traits: traits.length > 0 ? traits : undefined,
      };

      if (opponent?.id) {
        await db.opponents.update(opponent.id, data);
        onSaved({ ...data, id: opponent.id });
      } else {
        const id = await db.opponents.add(data as Opponent);
        onSaved({ ...data, id: id as number });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 w-full sm:max-w-md sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <h3 className="text-sm font-semibold text-txt">
            {opponent?.id ? 'Edit Opponent' : 'Add Opponent Info'}
          </h3>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <Input
            label="Opponent Name"
            placeholder="Team name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Formation tendencies, key players, patterns..."
          />

          <Textarea
            label="Strengths"
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
            rows={2}
            placeholder="What they do well..."
          />

          <TagPicker
            label="Traits (up to 5)"
            options={OPPONENT_TRAITS}
            selected={traits}
            onChange={setTraits}
            max={5}
            allowCustom
          />
        </div>

        <div className="px-4 py-3 border-t border-surface-5 shrink-0">
          <Button onClick={handleSave} disabled={!canSave || saving} className="w-full">
            {saving ? 'Saving...' : opponent?.id ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
