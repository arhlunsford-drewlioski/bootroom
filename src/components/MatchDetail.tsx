import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SessionNote, LineupTemplate } from '../db/database';
import { to12Hour } from '../utils/time';
import { TACTICAL_INTENT_TAGS, KEY_MATCH_TAGS, TACTICAL_TAGS } from '../constants/tags';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import TagPicker from './ui/TagPicker';
import ConfirmDialog from './ui/ConfirmDialog';

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
  return `${goalsFor}\u2013${goalsAgainst}`;
}

export default function MatchDetail({ matchId, onClose, onOpenLineup }: MatchDetailProps) {
  const match = useLiveQuery(() => db.matches.get(matchId), [matchId]);
  const team = useLiveQuery(() => db.teams.toCollection().first(), []);

  const templates = useLiveQuery(
    () => (team?.id ? db.lineupTemplates.where('teamId').equals(team.id).toArray() : []),
    [team?.id],
  ) ?? [];

  const [goalsFor, setGoalsFor] = useState<string>('');
  const [goalsAgainst, setGoalsAgainst] = useState<string>('');
  const [completed, setCompleted] = useState(false);
  const [notes, setNotes] = useState('');
  const [reflection, setReflection] = useState('');
  const [tacticalIntentTags, setTacticalIntentTags] = useState<string[]>([]);
  const [inGameNotes, setInGameNotes] = useState<SessionNote[]>([]);
  const [keyTags, setKeyTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Template picker
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateFlash, setTemplateFlash] = useState<string | null>(null);

  // In-game note input
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (match) {
      setGoalsFor(match.goalsFor != null ? String(match.goalsFor) : '');
      setGoalsAgainst(match.goalsAgainst != null ? String(match.goalsAgainst) : '');
      setCompleted(match.completed ?? false);
      setNotes(match.notes ?? '');
      setReflection(match.reflection ?? '');
      setTacticalIntentTags(match.tacticalIntentTags ?? []);
      setInGameNotes(match.inGameNotes ?? []);
      setKeyTags(match.keyTags ?? []);
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
        tacticalIntentTags: tacticalIntentTags.length > 0 ? tacticalIntentTags : undefined,
        inGameNotes: inGameNotes.length > 0 ? inGameNotes : undefined,
        keyTags: keyTags.length > 0 ? keyTags : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    await db.matches.delete(matchId);
    onClose();
  };

  // In-game notes helpers
  const addInGameNote = (text: string, tags?: string[]) => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setInGameNotes(prev => [...prev, {
      text: text.trim(),
      timestamp,
      tags: tags && tags.length > 0 ? tags : undefined,
    }]);
    setNoteText('');
  };

  const removeInGameNote = (index: number) => {
    setInGameNotes(prev => prev.filter((_, i) => i !== index));
  };

  // Apply a lineup template to this match
  const applyTemplate = async (template: LineupTemplate) => {
    await db.matches.update(matchId, {
      lineup: template.positions,
      bench: template.bench ?? [],
      formation: template.formation,
    });
    setShowTemplatePicker(false);
    setTemplateFlash(template.name);
    setTimeout(() => setTemplateFlash(null), 2000);
  };

  // Save current match lineup as a template
  const saveLineupAsTemplate = async () => {
    if (!match || !team?.id || !match.lineup || match.lineup.length === 0) return;
    const name = `${match.opponent} ${match.date} (${match.formation || 'Custom'})`;
    await db.lineupTemplates.add({
      teamId: team.id,
      name,
      formation: match.formation || '',
      positions: match.lineup,
      bench: match.bench,
      matchId: match.id,
      createdAt: new Date().toISOString(),
    });
    setTemplateFlash('Saved as template');
    setTimeout(() => setTemplateFlash(null), 2000);
  };

  if (!match) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-surface-2 rounded-lg p-8 text-txt-muted">Loading...</div>
      </div>
    );
  }

  const formattedDate = new Date(match.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

  const lineupStatus = match.lineup && match.lineup.length > 0;

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
            <button
              onClick={() => setCompleted(c => !c)}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                completed
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-surface-4 text-txt-faint'
              }`}
            >
              {completed ? 'Completed' : 'Upcoming'}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* ═══ PRE-MATCH ═══ */}
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">Pre-Match</div>

            {/* Match info header */}
            <div className="rounded-lg border border-surface-5 bg-surface-2 p-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {match.isHome != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        match.isHome
                          ? 'bg-accent/15 text-accent border border-accent/20'
                          : 'bg-surface-3 text-txt-muted border border-surface-5'
                      }`}>
                        {match.isHome ? 'HOME' : 'AWAY'}
                      </span>
                    )}
                    <h2 className="text-lg font-semibold text-accent">vs {match.opponent}</h2>
                  </div>
                  <p className="text-xs text-txt-faint mt-1">
                    {formattedDate} &middot; {to12Hour(match.time)}
                    {match.location && <span className="text-txt-faint"> &middot; {match.location}</span>}
                  </p>
                </div>
                {outcome && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${outcomeColor}`}>
                    {formatResult(gf, ga)} {outcome}
                  </span>
                )}
              </div>

              {/* Lineup + Formation row */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${lineupStatus ? 'bg-emerald-400' : 'bg-surface-5'}`} />
                  <span className="text-xs text-txt-muted truncate">
                    {lineupStatus
                      ? `Lineup set${match.formation ? ` \u00b7 ${match.formation}` : ''} \u00b7 ${match.lineup!.length} players`
                      : 'Lineup not set'}
                  </span>
                </div>
                <Button variant="secondary" onClick={onOpenLineup} className="text-xs shrink-0">
                  {lineupStatus ? 'Edit Lineup' : 'Set Lineup'}
                </Button>
              </div>

              {/* Template actions */}
              <div className="flex items-center gap-2 mt-2 border-t border-surface-5 pt-2">
                <button
                  onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                  className="text-[10px] text-txt-faint hover:text-accent transition-colors"
                >
                  Use lineup template
                </button>
                {lineupStatus && (
                  <>
                    <span className="text-txt-faint text-[10px]">&middot;</span>
                    <button
                      onClick={saveLineupAsTemplate}
                      className="text-[10px] text-txt-faint hover:text-accent transition-colors"
                    >
                      Save lineup as template
                    </button>
                  </>
                )}
                {templateFlash && (
                  <span className="text-[10px] text-emerald-400 font-medium ml-auto">{templateFlash}</span>
                )}
              </div>

              {/* Template picker dropdown */}
              {showTemplatePicker && (
                <div className="mt-2 bg-surface-1 rounded-lg border border-surface-5 max-h-48 overflow-y-auto">
                  {templates.length === 0 ? (
                    <p className="text-xs text-txt-faint text-center py-4">No lineup templates saved yet.</p>
                  ) : (
                    templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="w-full text-left px-3 py-2 hover:bg-surface-3 transition-colors border-b border-surface-5 last:border-b-0"
                      >
                        <div className="text-xs font-medium text-txt">{t.name}</div>
                        <div className="text-[10px] text-txt-faint">
                          {t.formation} &middot; {t.positions.length} players
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Tactical Intent Tags */}
            <div className="mt-3">
              <TagPicker
                label="Tactical Intent"
                options={[...TACTICAL_INTENT_TAGS]}
                selected={tacticalIntentTags}
                onChange={setTacticalIntentTags}
                max={4}
                allowCustom
              />
            </div>

            {/* Pre-game notes */}
            <div className="mt-3">
              <Textarea
                label="Pre-Game Notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Key matchups, set piece plan, shape adjustments..."
              />
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-surface-5" />

          {/* ═══ IN-GAME ═══ */}
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">In-Game Notes</div>

            {/* Rolling notes list */}
            {inGameNotes.length > 0 && (
              <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                {inGameNotes.map((note, i) => (
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
                      onClick={() => removeInGameNote(i)}
                      className="text-txt-faint hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      &times;
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
                placeholder="Quick note..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && noteText.trim()) {
                    e.preventDefault();
                    addInGameNote(noteText);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => { if (noteText.trim()) addInGameNote(noteText); }}
                disabled={!noteText.trim()}
                className="h-9 px-3 rounded-md text-sm bg-accent text-surface-1 font-medium hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Add
              </button>
            </div>

            {/* Quick tactical adjustment tags */}
            <div className="mt-2">
              <label className="block text-[10px] font-medium text-txt-faint mb-1.5">Quick Tags</label>
              <div className="flex flex-wrap gap-1">
                {TACTICAL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addInGameNote(tag, [tag])}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-3 text-txt-muted border border-surface-5 hover:bg-surface-4 hover:text-txt transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-surface-5" />

          {/* ═══ POST-MATCH ═══ */}
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mb-3">Post-Match</div>

            {/* Result entry */}
            <div className="rounded-lg border border-surface-5 bg-surface-2 p-3">
              <h3 className="text-xs font-semibold text-txt mb-2">Result</h3>
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

            {/* Key Tags */}
            <div className="mt-3">
              <TagPicker
                label="Key Tags"
                options={[...KEY_MATCH_TAGS]}
                selected={keyTags}
                onChange={setKeyTags}
                max={3}
                allowCustom
              />
            </div>

            {/* Reflection */}
            <div className="mt-3">
              <Textarea
                label="Reflection"
                value={reflection}
                onChange={e => setReflection(e.target.value)}
                rows={2}
                placeholder="What worked? What needs fixing?"
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-5 shrink-0 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={async () => { await handleSave(); onClose(); }}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
          <button
            onClick={handleDelete}
            className="text-xs text-txt-faint hover:text-red-400 transition-colors shrink-0"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Match"
        message="Delete this match? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
