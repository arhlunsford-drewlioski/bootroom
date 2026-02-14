import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Player, PlayerEvaluation, PlayerStats } from '../db/database';
import Textarea from './ui/Textarea';
import Input from './ui/Input';
import Button from './ui/Button';

/* ── rating scale labels ── */
const SCALE_LABELS: Record<number, string> = {
  1: 'Seldom',
  2: 'Inconsistently',
  3: 'Sometimes',
  4: 'Often',
  5: 'Always',
};

/* ── position tag options ── */
const POSITION_OPTIONS = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'ST', 'CF',
];

/* ── evaluation field definitions ── */
interface EvalField {
  key: keyof PlayerEvaluation;
  label: string;
  description?: string;
}

const TECHNICAL_FIELDS: EvalField[] = [
  { key: 'techPassing', label: 'Passing', description: 'Pass accurately over various distances with both feet' },
  { key: 'techDribbling', label: 'Dribbling', description: 'Keep control of the ball when dribbling at pace' },
  { key: 'techBallManipulation', label: 'Ball Manipulation', description: 'Manipulates the ball to unbalance opponents' },
  { key: 'techStriking', label: 'Striking', description: 'Consistently strikes a ball with power' },
  { key: 'techReceiving', label: 'Receiving', description: 'Receives the ball with different surfaces (head, thigh, chest, foot)' },
  { key: 'techTackling', label: 'Tackling', description: 'Consistently win the ball with appropriate tackle' },
  { key: 'techCreativity', label: 'Creativity', description: 'Creative, imaginative, and deceptive with the ball' },
];

const TACTICAL_FIELDS: EvalField[] = [
  { key: 'tacAttackingDecisions', label: 'Attacking — Decision Making', description: 'Decision making in possession' },
  { key: 'tacAttackingPassDribble', label: 'Attacking — Pass vs Dribble', description: 'Routinely makes good choices of when to pass and when to dribble' },
  { key: 'tacAttackingPositioning', label: 'Attacking — Positioning', description: 'Understands positions and supports teammates effectively (width, depth, etc.)' },
  { key: 'tacDefendingPCB', label: 'Defending — Pressure/Cover/Balance', description: 'Understands pressure, cover & balance and implements them in play' },
  { key: 'tacDefendingPressHoldDrop', label: 'Defending — Press/Hold/Drop', description: 'Understands when to press, hold, or drop — individually and as a team' },
  { key: 'tacAttackingTransitions', label: 'Attacking Transitions', description: 'Reacts quickly when the ball is won' },
  { key: 'tacDefensiveTransitions', label: 'Defensive Transitions', description: 'Reacts quickly when the ball is lost' },
];

const PSYCHOLOGICAL_FIELDS: EvalField[] = [
  { key: 'psyCompetitiveness', label: 'Competitiveness', description: 'Is competitive, and competes to improve' },
  { key: 'psyFocus', label: 'Focus & Coachability', description: 'Focuses during practices and games, and utilizes coach feedback to improve' },
  { key: 'psyResilience', label: 'Resilience', description: 'Recovers quickly from frustrations/disappointments' },
  { key: 'psyCommunication', label: 'Communication', description: 'Communicates with coaches and teammates in a positive manner' },
  { key: 'psySelfDevelopment', label: 'Self-Development', description: 'Actively seeks other ways to develop themselves' },
];

const PHYSICAL_FIELDS: EvalField[] = [
  { key: 'physAgility', label: 'Agility' },
  { key: 'physQuickness', label: 'Quickness' },
  { key: 'physFitness', label: 'Fitness' },
  { key: 'physStrength', label: 'Strength' },
];

/* ── rating dots component ── */
function RatingDots({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? undefined : n)}
            className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all ${
              value != null && n <= value
                ? 'bg-accent text-surface-0'
                : 'bg-surface-3 text-txt-faint hover:bg-surface-4 hover:text-txt-muted'
            }`}
            title={SCALE_LABELS[n]}
          >
            {n}
          </button>
        ))}
      </div>
      {value != null && (
        <span className="block text-[10px] text-txt-faint mt-1">{SCALE_LABELS[value]}</span>
      )}
    </div>
  );
}

/* ── section average helper ── */
function sectionAvg(eval_: Partial<PlayerEvaluation>, fields: EvalField[]): string | null {
  const vals = fields
    .map(f => eval_[f.key] as number | undefined)
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

/* ── keeper check ── */
function isKeeper(player: Player): boolean {
  const tags = [
    ...(player.positionTags ?? []),
    player.roleTag ?? '',
  ].map(t => t.toLowerCase());
  return tags.some(t => t === 'gk' || t === 'keeper' || t === 'goalkeeper');
}

/* ══════════════════════════════════════════════════
   STATS TAB
   ══════════════════════════════════════════════════ */
function StatsTab({ player }: { player: Player }) {
  const allStats = useLiveQuery(
    () => db.playerStats.where('playerId').equals(player.id!).toArray(),
    [player.id],
  ) ?? [];

  const [showAddStat, setShowAddStat] = useState(false);
  const [statForm, setStatForm] = useState<Partial<PlayerStats>>({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const keeper = isKeeper(player);

  // Aggregated totals
  const totals = useMemo(() => {
    const t = {
      games: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      attended: 0,
      saves: 0,
      cleanSheets: 0,
      penaltiesSaved: 0,
    };
    for (const s of allStats) {
      t.games++;
      t.minutes += s.minutesPlayed ?? 0;
      t.goals += s.goals ?? 0;
      t.assists += s.assists ?? 0;
      t.yellowCards += s.yellowCards ?? 0;
      t.redCards += s.redCards ?? 0;
      if (s.attended !== false) t.attended++;
      t.saves += s.saves ?? 0;
      t.cleanSheets += s.cleanSheets ?? 0;
      t.penaltiesSaved += s.penaltiesSaved ?? 0;
    }
    return t;
  }, [allStats]);

  const handleSave = async () => {
    if (!statForm.date) return;
    setSaving(true);
    try {
      const payload: PlayerStats = {
        playerId: player.id!,
        teamId: player.teamId,
        date: statForm.date,
        minutesPlayed: statForm.minutesPlayed,
        goals: statForm.goals,
        assists: statForm.assists,
        yellowCards: statForm.yellowCards,
        redCards: statForm.redCards,
        attended: statForm.attended,
        saves: statForm.saves,
        cleanSheets: statForm.cleanSheets,
        penaltiesSaved: statForm.penaltiesSaved,
      };
      if (editingId != null) {
        await db.playerStats.update(editingId, payload);
      } else {
        await db.playerStats.add(payload);
      }
      setStatForm({});
      setShowAddStat(false);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save player stats:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (stat: PlayerStats) => {
    setEditingId(stat.id!);
    setStatForm({ ...stat });
    setShowAddStat(true);
  };

  const deleteStat = async (id: number) => {
    await db.playerStats.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setStatForm({});
      setShowAddStat(false);
    }
  };

  // Sort stats by date descending
  const sortedStats = [...allStats].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      {/* Aggregate summary */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <StatBox label="Games" value={totals.games} />
        <StatBox label="Minutes" value={totals.minutes} />
        <StatBox label="Goals" value={totals.goals} />
        <StatBox label="Assists" value={totals.assists} />
        <StatBox label="Yellow" value={totals.yellowCards} color="text-amber-400" />
        <StatBox label="Red" value={totals.redCards} color="text-red-400" />
        <StatBox label="Attended" value={totals.attended} />
        {keeper && (
          <>
            <StatBox label="Saves" value={totals.saves} />
            <StatBox label="Clean Sheets" value={totals.cleanSheets} />
            <StatBox label="PKs Saved" value={totals.penaltiesSaved} />
          </>
        )}
      </div>

      {/* Add/edit match stat form */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">
          Match Log ({sortedStats.length})
        </h4>
        <button
          onClick={() => {
            setShowAddStat(!showAddStat);
            setEditingId(null);
            setStatForm({});
          }}
          className="text-[10px] text-accent hover:text-accent-dark transition-colors font-medium"
        >
          {showAddStat ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {showAddStat && (
        <div className="bg-surface-2 rounded-lg border border-surface-5 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Date"
              type="date"
              value={statForm.date ?? ''}
              onChange={e => setStatForm(p => ({ ...p, date: e.target.value }))}
            />
            <Input
              label="Minutes Played"
              type="number"
              min="0"
              placeholder="0"
              value={statForm.minutesPlayed ?? ''}
              onChange={e => setStatForm(p => ({ ...p, minutesPlayed: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input
              label="Goals"
              type="number"
              min="0"
              placeholder="0"
              value={statForm.goals ?? ''}
              onChange={e => setStatForm(p => ({ ...p, goals: e.target.value ? Number(e.target.value) : undefined }))}
            />
            <Input
              label="Assists"
              type="number"
              min="0"
              placeholder="0"
              value={statForm.assists ?? ''}
              onChange={e => setStatForm(p => ({ ...p, assists: e.target.value ? Number(e.target.value) : undefined }))}
            />
            <Input
              label="Yellows"
              type="number"
              min="0"
              placeholder="0"
              value={statForm.yellowCards ?? ''}
              onChange={e => setStatForm(p => ({ ...p, yellowCards: e.target.value ? Number(e.target.value) : undefined }))}
            />
            <Input
              label="Reds"
              type="number"
              min="0"
              placeholder="0"
              value={statForm.redCards ?? ''}
              onChange={e => setStatForm(p => ({ ...p, redCards: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          {keeper && (
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Saves"
                type="number"
                min="0"
                placeholder="0"
                value={statForm.saves ?? ''}
                onChange={e => setStatForm(p => ({ ...p, saves: e.target.value ? Number(e.target.value) : undefined }))}
              />
              <Input
                label="Clean Sheet"
                type="number"
                min="0"
                max="1"
                placeholder="0"
                value={statForm.cleanSheets ?? ''}
                onChange={e => setStatForm(p => ({ ...p, cleanSheets: e.target.value ? Number(e.target.value) : undefined }))}
              />
              <Input
                label="PKs Saved"
                type="number"
                min="0"
                placeholder="0"
                value={statForm.penaltiesSaved ?? ''}
                onChange={e => setStatForm(p => ({ ...p, penaltiesSaved: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !statForm.date}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Match log */}
      {sortedStats.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {sortedStats.map(stat => (
            <div
              key={stat.id}
              className="flex items-center gap-3 px-3 py-2 bg-surface-2 rounded-lg border border-surface-5 group"
            >
              <span className="text-[10px] text-txt-faint font-mono w-20 shrink-0">
                {new Date(stat.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {stat.minutesPlayed != null && (
                  <span className="text-[10px] text-txt-muted">{stat.minutesPlayed}&prime;</span>
                )}
                {(stat.goals ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-txt">{stat.goals}G</span>
                )}
                {(stat.assists ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-txt">{stat.assists}A</span>
                )}
                {(stat.yellowCards ?? 0) > 0 && (
                  <span className="w-3 h-4 rounded-sm bg-amber-400 inline-block" title="Yellow card" />
                )}
                {(stat.redCards ?? 0) > 0 && (
                  <span className="w-3 h-4 rounded-sm bg-red-500 inline-block" title="Red card" />
                )}
                {keeper && (stat.saves ?? 0) > 0 && (
                  <span className="text-[10px] text-txt-muted">{stat.saves}SV</span>
                )}
                {keeper && (stat.cleanSheets ?? 0) > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold">CS</span>
                )}
                {keeper && (stat.penaltiesSaved ?? 0) > 0 && (
                  <span className="text-[10px] text-accent font-bold">{stat.penaltiesSaved}PK</span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => startEdit(stat)}
                  className="text-txt-faint hover:text-txt text-xs p-1 transition-colors"
                  title="Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteStat(stat.id!)}
                  className="text-txt-faint hover:text-red-400 text-xs p-1 transition-colors"
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedStats.length === 0 && !showAddStat && (
        <p className="text-[10px] text-txt-faint text-center py-4">No match stats recorded yet.</p>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-surface-2 rounded-lg px-3 py-2 text-center">
      <div className={`text-lg font-bold ${color ?? 'text-txt'}`}>{value}</div>
      <div className="text-[9px] text-txt-faint uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   EVAL TAB
   ══════════════════════════════════════════════════ */
function EvalTab({ player }: { player: Player }) {
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const evaluations = useLiveQuery(
    () =>
      db.playerEvaluations
        .where('playerId')
        .equals(player.id!)
        .reverse()
        .sortBy('date'),
    [player.id],
  ) ?? [];

  const latestEval = evaluations[0] ?? null;

  const [form, setForm] = useState<Partial<PlayerEvaluation>>({});

  useEffect(() => {
    if (latestEval) {
      setForm({ ...latestEval });
    } else {
      setForm({});
    }
  }, [latestEval?.id, latestEval?.date]);

  const setField = (key: keyof PlayerEvaluation, value: number | undefined) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { id: _id, ...fields } = form;
      const payload: PlayerEvaluation = {
        ...fields as PlayerEvaluation,
        playerId: player.id!,
        teamId: player.teamId,
        date: today,
      };
      if (latestEval && latestEval.date === today) {
        await db.playerEvaluations.update(latestEval.id!, payload);
      } else {
        await db.playerEvaluations.add(payload);
      }
      setFlash('Saved');
      setTimeout(() => setFlash(null), 1500);
    } catch (err) {
      console.error('Failed to save evaluation:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (title: string, fields: EvalField[], showDescriptions: boolean) => {
    const avg = sectionAvg(form, fields);
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint">{title}</h4>
          {avg && <span className="text-[10px] font-bold text-accent">{avg}</span>}
        </div>
        <div className="space-y-2">
          {fields.map(field => (
            <div key={field.key} className="bg-surface-2 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-txt">{field.label}</span>
                  {showDescriptions && field.description && (
                    <p className="text-[10px] text-txt-faint mt-0.5 leading-tight">{field.description}</p>
                  )}
                </div>
                <RatingDots
                  value={form[field.key] as number | undefined}
                  onChange={v => setField(field.key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {latestEval && (
        <div className="text-[10px] text-txt-faint">
          Last evaluated: {new Date(latestEval.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </div>
      )}

      {renderSection('Technical', TECHNICAL_FIELDS, true)}
      <div className="border-t border-surface-5" />
      {renderSection('Tactical', TACTICAL_FIELDS, true)}
      <div className="border-t border-surface-5" />
      {renderSection('Psychological', PSYCHOLOGICAL_FIELDS, true)}
      <div className="border-t border-surface-5" />
      {renderSection('Physical', PHYSICAL_FIELDS, false)}
      <div className="border-t border-surface-5" />

      <div>
        <Textarea
          label="Notes"
          value={form.notes ?? ''}
          onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          placeholder="Development notes, areas to focus on..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-surface-0 hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Evaluation'}
        </button>
        {flash && (
          <span className="text-[10px] text-emerald-400 font-medium">{flash}</span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   POSITION TAG PICKER (inline)
   ══════════════════════════════════════════════════ */
function PositionTagPicker({ playerId }: { playerId: number }) {
  // Use live query so tags update immediately on click
  const livePlayer = useLiveQuery(() => db.players.get(playerId), [playerId]);
  const tags = livePlayer?.positionTags ?? [];

  const toggle = async (pos: string) => {
    let next: string[];
    if (tags.includes(pos)) {
      next = tags.filter(t => t !== pos);
    } else if (tags.length < 2) {
      next = [...tags, pos];
    } else {
      // replace second
      next = [tags[0], pos];
    }
    await db.players.update(playerId, { positionTags: next });
  };

  return (
    <div>
      <label className="block text-[10px] font-medium text-txt-faint mb-1.5">Positions (max 2)</label>
      <div className="flex flex-wrap gap-1">
        {POSITION_OPTIONS.map(pos => {
          const active = tags.includes(pos);
          return (
            <button
              key={pos}
              type="button"
              onClick={() => toggle(pos)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                active
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-surface-3 text-txt-faint border border-surface-5 hover:bg-surface-4 hover:text-txt-muted'
              }`}
            >
              {pos}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PLAYER CARD
   ══════════════════════════════════════════════════ */
interface PlayerCardProps {
  player: Player;
  onDelete: (playerId: number) => void;
  onUpdate?: () => void;
}

export default function PlayerCard({ player, onDelete, onUpdate }: PlayerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState(player.name);
  const [editNumber, setEditNumber] = useState(String(player.jerseyNumber));

  // Load eval averages for preview pills
  const evaluations = useLiveQuery(
    () =>
      db.playerEvaluations
        .where('playerId')
        .equals(player.id!)
        .reverse()
        .sortBy('date'),
    [player.id],
  ) ?? [];

  const latestEval = evaluations[0] ?? null;

  const techAvg = latestEval ? sectionAvg(latestEval, TECHNICAL_FIELDS) : null;
  const tacAvg = latestEval ? sectionAvg(latestEval, TACTICAL_FIELDS) : null;
  const psyAvg = latestEval ? sectionAvg(latestEval, PSYCHOLOGICAL_FIELDS) : null;
  const physAvg = latestEval ? sectionAvg(latestEval, PHYSICAL_FIELDS) : null;
  const hasAnyRating = techAvg || tacAvg || psyAvg || physAvg;

  // Load stats summary for preview
  const allStats = useLiveQuery(
    () => db.playerStats.where('playerId').equals(player.id!).toArray(),
    [player.id],
  ) ?? [];

  const statsSummary = useMemo(() => {
    const t = { games: 0, goals: 0, assists: 0 };
    for (const s of allStats) {
      t.games++;
      t.goals += s.goals ?? 0;
      t.assists += s.assists ?? 0;
    }
    return t;
  }, [allStats]);

  // Live query for position tags so header updates when picker changes
  const livePlayer = useLiveQuery(() => db.players.get(player.id!), [player.id]);
  const positionTags = livePlayer?.positionTags ?? player.positionTags ?? [];

  return (
    <div className="bg-surface-1 rounded-lg border border-surface-5 hover:border-surface-4 transition-colors">
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Jersey number badge */}
        <div className="w-10 h-10 rounded-full bg-accent text-surface-0 flex items-center justify-center text-sm font-bold shrink-0">
          {player.jerseyNumber}
        </div>

        {/* Name + position tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-txt truncate">{player.name}</span>
            {positionTags.map(pos => (
              <span key={pos} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-3 text-txt-muted border border-surface-5">
                {pos}
              </span>
            ))}
          </div>
          {/* Quick stat line under name */}
          {statsSummary.games > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-txt-faint">{statsSummary.games} GP</span>
              {statsSummary.goals > 0 && (
                <span className="text-[10px] text-txt-faint">{statsSummary.goals}G</span>
              )}
              {statsSummary.assists > 0 && (
                <span className="text-[10px] text-txt-faint">{statsSummary.assists}A</span>
              )}
            </div>
          )}
        </div>

        {/* Quick eval averages preview */}
        {hasAnyRating && (
          <div className="hidden sm:flex items-center gap-1.5">
            {techAvg && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-clr-info/15 text-clr-info border border-clr-info/20">
                TEC {techAvg}
              </span>
            )}
            {tacAvg && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-clr-success/15 text-clr-success border border-clr-success/20">
                TAC {tacAvg}
              </span>
            )}
            {psyAvg && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-clr-purple/15 text-clr-purple border border-clr-purple/20">
                PSY {psyAvg}
              </span>
            )}
            {physAvg && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-clr-warning/15 text-clr-warning border border-clr-warning/20">
                PHY {physAvg}
              </span>
            )}
          </div>
        )}

        {/* Edit + Delete + Chevron */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => {
              e.stopPropagation();
              setEditName(livePlayer?.name ?? player.name);
              setEditNumber(String(livePlayer?.jerseyNumber ?? player.jerseyNumber));
              setEditingInfo(true);
              if (!expanded) setExpanded(true);
            }}
            className="text-txt-faint hover:text-accent transition-colors text-xs p-1"
            title="Edit player"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(player.id!); }}
            className="text-txt-faint hover:text-red-400 transition-colors text-xs p-1"
            title="Remove player"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className={`text-txt-faint transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-surface-5">
          {/* Edit name/number (shown when edit icon clicked) */}
          {editingInfo && (
            <div className="px-4 pt-3 pb-3 border-b border-surface-5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-medium text-txt-faint mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 w-full rounded-md border border-surface-5 bg-surface-0 px-2.5 text-xs text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                    autoFocus
                  />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-medium text-txt-faint mb-1">#</label>
                  <input
                    type="number"
                    value={editNumber}
                    onChange={e => setEditNumber(e.target.value)}
                    className="h-8 w-full rounded-md border border-surface-5 bg-surface-0 px-2.5 text-xs text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!editName.trim() || !editNumber) return;
                    await db.players.update(player.id!, {
                      name: editName.trim(),
                      jerseyNumber: parseInt(editNumber),
                    });
                    setEditingInfo(false);
                    onUpdate?.();
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-accent text-surface-0 hover:bg-accent-dark transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingInfo(false)}
                  className="h-8 px-3 rounded-md text-xs font-medium bg-surface-3 text-txt-muted hover:bg-surface-4 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Positions accordion */}
          <div className="border-b border-surface-5">
            <button
              onClick={() => setPositionsOpen(!positionsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-2/50 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-faint">Positions</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-txt-faint transition-transform ${positionsOpen ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {positionsOpen && (
              <div className="px-4 pb-4">
                <PositionTagPicker playerId={player.id!} />
              </div>
            )}
          </div>

          {/* Stats accordion */}
          <div className="border-t border-surface-5">
            <button
              onClick={() => setStatsOpen(!statsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-2/50 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-faint">Stats</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-txt-faint transition-transform ${statsOpen ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {statsOpen && (
              <div className="px-4 pb-4">
                <StatsTab player={player} />
              </div>
            )}
          </div>

          {/* Evaluation accordion */}
          <div className="border-t border-surface-5">
            <button
              onClick={() => setEvalOpen(!evalOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-2/50 transition-colors"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-txt-faint">Evaluation</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`text-txt-faint transition-transform ${evalOpen ? 'rotate-90' : ''}`}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {evalOpen && (
              <div className="px-4 pb-4">
                <EvalTab player={player} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
