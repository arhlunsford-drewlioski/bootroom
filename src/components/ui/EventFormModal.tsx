import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { posthog } from '../../analytics';
import Button from './Button';
import Input from './Input';
import TimePicker from './TimePicker';

interface EventFormModalProps {
  open: boolean;
  dateStr: string;
  teamId: number;
  initialType?: 'match' | 'practice';
  onClose: () => void;
  onCreated?: (type: 'match' | 'practice', id: number) => void;
}

export default function EventFormModal({
  open,
  dateStr,
  teamId,
  initialType = 'practice',
  onClose,
  onCreated,
}: EventFormModalProps) {
  const [eventType, setEventType] = useState<'match' | 'practice'>(initialType);
  const [opponent, setOpponent] = useState('');
  const [focus, setFocus] = useState('');
  const [time, setTime] = useState('16:00');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset form when modal opens or type changes
  useEffect(() => {
    if (open) {
      setEventType(initialType);
      setOpponent('');
      setFocus('');
      setTime('16:00');
      setLocation('');
    }
  }, [open, initialType]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const canCreate = eventType === 'match'
    ? opponent.trim().length > 0 && time.length > 0
    : focus.trim().length > 0 && time.length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      if (eventType === 'match') {
        const id = await db.matches.add({
          teamId,
          opponent: opponent.trim(),
          date: dateStr,
          time,
          location: location.trim() || undefined,
        });
        posthog.capture('match_created');
        onCreated?.('match', id as number);
      } else {
        const id = await db.practices.add({
          teamId,
          focus: focus.trim(),
          date: dateStr,
          time,
          status: 'planned',
        });
        posthog.capture('practice_created');
        onCreated?.('practice', id as number);
      }
      onClose();
    } finally {
      setCreating(false);
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-txt">Add Event</h3>
            <p className="text-xs text-txt-faint mt-0.5">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-lg">
            <button
              onClick={() => setEventType('practice')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                eventType === 'practice'
                  ? 'bg-accent text-surface-0'
                  : 'text-txt-muted hover:text-txt'
              }`}
            >
              Practice
            </button>
            <button
              onClick={() => setEventType('match')}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                eventType === 'match'
                  ? 'bg-accent text-surface-0'
                  : 'text-txt-muted hover:text-txt'
              }`}
            >
              Match
            </button>
          </div>

          {/* Conditional fields */}
          {eventType === 'practice' ? (
            <Input
              label="Session Focus"
              placeholder='e.g., "Possession"'
              value={focus}
              onChange={e => setFocus(e.target.value)}
              autoFocus
            />
          ) : (
            <>
              <Input
                label="Opponent"
                placeholder="Opponent name"
                value={opponent}
                onChange={e => setOpponent(e.target.value)}
                autoFocus
              />
              <Input
                label="Location"
                placeholder="Optional"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </>
          )}

          <TimePicker label="Time" value={time} onChange={setTime} />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-5 shrink-0">
          <Button onClick={handleCreate} disabled={!canCreate || creating} className="w-full">
            {creating ? 'Creating...' : `Create ${eventType === 'match' ? 'Match' : 'Practice'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
