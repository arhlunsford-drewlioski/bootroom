import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';

interface MatchDetailProps {
  matchId: number;
  onClose: () => void;
  onOpenLineup: () => void;
}

function deriveOutcome(goalsFor: number | undefined, goalsAgainst: number | undefined): string | null {
  if (goalsFor == null || goalsAgainst == null) return null;
  if (goalsFor > goalsAgainst) return 'W';
  if (goalsFor < goalsAgainst) return 'L';
  return 'D';
}

function formatResult(goalsFor: number | undefined, goalsAgainst: number | undefined): string {
  if (goalsFor == null || goalsAgainst == null) return '';
  return `${goalsFor}–${goalsAgainst}`;
}

export default function MatchDetail({ matchId, onClose, onOpenLineup }: MatchDetailProps) {
  const match = useLiveQuery(() => db.matches.get(matchId), [matchId]);

  const [goalsFor, setGoalsFor] = useState<string>('');
  const [goalsAgainst, setGoalsAgainst] = useState<string>('');
  const [completed, setCompleted] = useState(false);
  const [notes, setNotes] = useState('');
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match) {
      setGoalsFor(match.goalsFor != null ? String(match.goalsFor) : '');
      setGoalsAgainst(match.goalsAgainst != null ? String(match.goalsAgainst) : '');
      setCompleted(match.completed ?? false);
      setNotes(match.notes ?? '');
      setReflection(match.reflection ?? '');
    }
  }, [match]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const gf = goalsFor !== '' ? Number(goalsFor) : undefined;
      const ga = goalsAgainst !== '' ? Number(goalsAgainst) : undefined;
      const outcome = deriveOutcome(gf, ga);
      const result = outcome ? `${formatResult(gf, ga)} ${outcome}` : undefined;

      await db.matches.update(matchId, {
        goalsFor: gf,
        goalsAgainst: ga,
        completed,
        result,
        notes: notes || undefined,
        reflection: reflection || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this match? This cannot be undone.')) return;
    await db.matches.delete(matchId);
    onClose();
  };

  if (!match) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-surface-2 rounded-lg p-8 text-txt-muted">Loading...</div>
      </div>
    );
  }

  const formattedDate = new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const gf = goalsFor !== '' ? Number(goalsFor) : undefined;
  const ga = goalsAgainst !== '' ? Number(goalsAgainst) : undefined;
  const outcome = deriveOutcome(gf, ga);

  const outcomeColor = outcome === 'W'
    ? 'bg-emerald-500/15 text-emerald-400'
    : outcome === 'L'
      ? 'bg-red-500/15 text-red-400'
      : outcome === 'D'
        ? 'bg-amber-500/15 text-amber-400'
        : '';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface-1 w-full sm:max-w-2xl sm:rounded-lg border border-surface-5 max-h-[95vh] flex flex-col rounded-t-2xl sm:rounded-t-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt transition-colors text-sm"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-2">
            <StatusPill completed={completed} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* Top: opponent, date/time, location */}
          <div>
            <h2 className="text-lg font-semibold text-accent">vs {match.opponent}</h2>
            <p className="text-xs text-txt-faint mt-1">
              {formattedDate} &middot; {match.time}
              {match.location && <span> &middot; {match.location}</span>}
            </p>
            {match.formation && (
              <p className="text-xs text-txt-muted mt-1">
                Formation: <span className="font-mono font-bold text-accent">{match.formation}</span>
                {match.lineup && match.lineup.length > 0 && (
                  <span className="text-txt-faint"> &middot; {match.lineup.length} in lineup</span>
                )}
              </p>
            )}
          </div>

          {/* Open Lineup button */}
          <Button onClick={onOpenLineup} className="w-full">
            Open Lineup
          </Button>

          {/* Result entry */}
          <div className="rounded-lg border border-surface-5 bg-surface-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-txt">Result</h3>
              {outcome && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${outcomeColor}`}>
                  {formatResult(gf, ga)} {outcome}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Goals For"
                type="number"
                min="0"
                value={goalsFor}
                onChange={e => setGoalsFor(e.target.value)}
                placeholder="0"
              />
              <Input
                label="Goals Against"
                type="number"
                min="0"
                value={goalsAgainst}
                onChange={e => setGoalsAgainst(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Completed toggle */}
          <button
            onClick={() => setCompleted(c => !c)}
            className="w-full flex items-center justify-between rounded-lg border border-surface-5 bg-surface-2 px-4 py-3"
          >
            <span className="text-sm text-txt">Mark as Completed</span>
            <div className={`w-10 h-6 rounded-full transition-colors relative ${completed ? 'bg-emerald-500' : 'bg-surface-4'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${completed ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          {/* Notes section */}
          <div className="space-y-4">
            <Textarea
              label="Pre-Game Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Tactical plan, key matchups, set pieces..."
            />
            <Textarea
              label="Post-Game Reflection"
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              rows={3}
              placeholder="What went well? What needs work?"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-5 shrink-0 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <button
            onClick={handleDelete}
            className="text-xs text-txt-faint hover:text-red-400 transition-colors shrink-0"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
        completed
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-surface-4 text-txt-faint'
      }`}
    >
      {completed ? 'Completed' : 'Upcoming'}
    </span>
  );
}
