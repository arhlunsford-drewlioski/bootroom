import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Opponent } from '../db/database';
import { to12Hour } from '../utils/time';
import OpponentModal from './OpponentModal';
import Button from './ui/Button';
import Input from './ui/Input';
import TimePicker from './ui/TimePicker';

interface MatchesListProps {
  teamId: number;
  onSelectMatch: (matchId: number) => void;
}

export default function MatchesList({ teamId, onSelectMatch }: MatchesListProps) {
  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId],
  ) ?? [];

  const opponents = useLiveQuery(
    () => db.opponents.where('teamId').equals(teamId).toArray(),
    [teamId],
  ) ?? [];

  // New match form
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [newOpponent, setNewOpponent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('16:00');
  const [newLocation, setNewLocation] = useState('');
  const [newIsHome, setNewIsHome] = useState(true);
  const [creating, setCreating] = useState(false);

  // Opponent modal
  const [opponentModalOpen, setOpponentModalOpen] = useState(false);
  const [editingOpponentForMatch, setEditingOpponentForMatch] = useState<Match | null>(null);

  const opponentMap = useMemo(() => {
    const map = new Map<number, Opponent>();
    for (const opp of opponents) {
      if (opp.id) map.set(opp.id, opp);
    }
    return map;
  }, [opponents]);

  // Find opponent by name (for matches without opponentId)
  const opponentByName = useMemo(() => {
    const map = new Map<string, Opponent>();
    for (const opp of opponents) {
      map.set(opp.name.toLowerCase(), opp);
    }
    return map;
  }, [opponents]);

  const getOpponentForMatch = (match: Match): Opponent | undefined => {
    if (match.opponentId) return opponentMap.get(match.opponentId);
    return opponentByName.get(match.opponent.toLowerCase());
  };

  // Sort matches: upcoming first (sorted by date asc), then completed (sorted by date desc)
  const sortedMatches = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const upcoming = matches
      .filter(m => !m.completed && m.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const past = matches
      .filter(m => m.completed || m.date < now)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    return { upcoming, past };
  }, [matches]);

  const canCreate = newOpponent.trim().length > 0 && newDate.length > 0 && newTime.length > 0;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      // Check if opponent exists, link it
      const existing = opponentByName.get(newOpponent.trim().toLowerCase());
      const id = await db.matches.add({
        teamId,
        opponent: newOpponent.trim(),
        opponentId: existing?.id,
        isHome: newIsHome,
        date: newDate,
        time: newTime,
        location: newLocation.trim() || undefined,
      });
      setShowNewMatch(false);
      setNewOpponent('');
      setNewDate('');
      setNewTime('16:00');
      setNewLocation('');
      setNewIsHome(true);
      onSelectMatch(id as number);
    } finally {
      setCreating(false);
    }
  };

  const openOpponentInfo = (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOpponentForMatch(match);
    setOpponentModalOpen(true);
  };

  const handleOpponentSaved = async (opp: Opponent) => {
    if (editingOpponentForMatch?.id && opp.id) {
      await db.matches.update(editingOpponentForMatch.id, {
        opponentId: opp.id,
        opponent: opp.name,
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const resultPill = (match: Match) => {
    if (!match.result) return null;
    const outcome = match.result.split(' ').pop();
    const color = outcome === 'W'
      ? 'bg-clr-success/15 text-clr-success border-clr-success/30'
      : outcome === 'L'
        ? 'bg-red-500/15 text-red-500 border-red-500/30'
        : 'bg-clr-warning/15 text-clr-warning border-clr-warning/30';
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
        {match.result}
      </span>
    );
  };

  const renderMatchRow = (match: Match) => {
    const opp = getOpponentForMatch(match);
    const hasOpponentInfo = !!opp;

    return (
      <div
        key={match.id}
        className="bg-surface-1 rounded-lg border border-surface-5 hover:border-surface-4 transition-colors cursor-pointer"
        onClick={() => onSelectMatch(match.id!)}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Date column */}
          <div className="w-20 shrink-0 text-center">
            <div className="text-xs text-txt-faint">{formatDate(match.date)}</div>
            <div className="text-[10px] text-txt-faint mt-0.5">{to12Hour(match.time)}</div>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-surface-5" />

          {/* Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                match.isHome !== false
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'bg-surface-3 text-txt-muted border border-surface-5'
              }`}>
                {match.isHome !== false ? 'H' : 'A'}
              </span>
              <span className="text-sm font-semibold text-txt truncate">
                vs {match.opponent}
              </span>
              {resultPill(match)}
            </div>
            {match.location && (
              <div className="text-[10px] text-txt-faint mt-1 truncate">{match.location}</div>
            )}
          </div>

          {/* Status + opponent info */}
          <div className="flex items-center gap-2 shrink-0">
            {!match.completed && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-3 text-txt-faint border border-surface-5">
                Upcoming
              </span>
            )}
            {match.completed && !match.result && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-clr-success/15 text-clr-success border border-clr-success/30">
                Completed
              </span>
            )}

            {/* Opponent info badge */}
            <button
              onClick={(e) => openOpponentInfo(match, e)}
              className={`p-1.5 rounded transition-colors ${
                hasOpponentInfo
                  ? 'text-accent hover:bg-accent/10'
                  : 'text-txt-faint hover:text-txt hover:bg-surface-3'
              }`}
              title={hasOpponentInfo ? 'View opponent info' : 'Add opponent info'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {hasOpponentInfo ? (
                  <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </>
                )}
              </svg>
            </button>

            {/* Chevron */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-txt-faint">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        {/* Opponent traits preview */}
        {opp?.traits && opp.traits.length > 0 && (
          <div className="px-4 pb-2.5 flex flex-wrap gap-1">
            {opp.traits.slice(0, 3).map(trait => (
              <span key={trait} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-accent/10 text-accent border border-accent/15">
                {trait}
              </span>
            ))}
            {opp.traits.length > 3 && (
              <span className="text-[9px] text-txt-faint">+{opp.traits.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-txt tracking-wide font-display">FIXTURES</h2>
        <Button onClick={() => setShowNewMatch(!showNewMatch)}>
          {showNewMatch ? 'Cancel' : '+ New Match'}
        </Button>
      </div>

      {/* New match form */}
      {showNewMatch && (
        <div className="bg-surface-1 rounded-lg border border-surface-5 p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Opponent"
              placeholder="Team name"
              value={newOpponent}
              onChange={e => setNewOpponent(e.target.value)}
              autoFocus
            />
            <Input
              label="Date"
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TimePicker label="Time" value={newTime} onChange={setNewTime} />
            <Input
              label="Location"
              placeholder="Optional"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
            />
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Home / Away</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-2 rounded-md h-9">
                <button
                  onClick={() => setNewIsHome(true)}
                  className={`rounded text-xs font-medium transition-colors ${
                    newIsHome ? 'bg-accent text-surface-0' : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setNewIsHome(false)}
                  className={`rounded text-xs font-medium transition-colors ${
                    !newIsHome ? 'bg-accent text-surface-0' : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  Away
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handleCreate} disabled={!canCreate || creating}>
              {creating ? 'Creating...' : 'Create Match'}
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      {sortedMatches.upcoming.length > 0 && (
        <section className="mb-8">
          <h3 className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3">
            Upcoming ({sortedMatches.upcoming.length})
          </h3>
          <div className="space-y-2">
            {sortedMatches.upcoming.map(renderMatchRow)}
          </div>
        </section>
      )}

      {/* Past/completed matches */}
      {sortedMatches.past.length > 0 && (
        <section>
          <h3 className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3">
            Results ({sortedMatches.past.length})
          </h3>
          <div className="space-y-2">
            {sortedMatches.past.map(renderMatchRow)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {matches.length === 0 && !showNewMatch && (
        <div className="text-center py-16">
          <p className="text-txt-faint text-sm mb-4">No matches yet. Create your first fixture.</p>
          <Button onClick={() => setShowNewMatch(true)}>+ New Match</Button>
        </div>
      )}

      {/* Opponent modal */}
      <OpponentModal
        open={opponentModalOpen}
        teamId={teamId}
        opponent={editingOpponentForMatch ? getOpponentForMatch(editingOpponentForMatch) ?? null : null}
        initialName={editingOpponentForMatch?.opponent}
        onClose={() => { setOpponentModalOpen(false); setEditingOpponentForMatch(null); }}
        onSaved={handleOpponentSaved}
      />
    </div>
  );
}
