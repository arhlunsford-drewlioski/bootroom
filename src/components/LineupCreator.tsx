import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Player, LineupEntry } from '../db/database';
import { posthog } from '../analytics';
import SoccerField from './SoccerField';
import { getFormationsForFormat, DEFAULT_FORMATION_FOR_FORMAT, FORMAT_SLOT_COUNT, getDetectionThreshold, getFormation, detectFormation } from './formations';
import type { PositionSlot } from './formations';
import { OPPONENT_TRAITS } from '../constants/tags';
import { compareLineups } from '../utils/lineup-diff';
import { exportLineupPng } from '../utils/export-image';
import RolePicker from './ui/RolePicker';
import TagPicker from './ui/TagPicker';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';

type DragOrigin = 'roster' | 'bench' | 'field';

interface LineupCreatorProps {
  initialMatchId?: number | null;
  onBackToMatch?: (matchId: number) => void;
}

export default function LineupCreator({ initialMatchId, onBackToMatch }: LineupCreatorProps) {
  const team = useLiveQuery(() => db.teams.toCollection().first(), []);
  const players = useLiveQuery(
    () => (team?.id ? db.players.where('teamId').equals(team.id).toArray() : []),
    [team?.id],
  ) ?? [];
  const matches = useLiveQuery(
    () => (team?.id ? db.matches.where('teamId').equals(team.id).toArray() : []),
    [team?.id],
  ) ?? [];

  // Match metadata
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [location, setLocation] = useState('');

  // Game format derived from team
  const gameFormat = team?.gameFormat ?? '11v11';
  const formatFormations = getFormationsForFormat(gameFormat);
  const slotCount = FORMAT_SLOT_COUNT[gameFormat];
  const detectionThreshold = getDetectionThreshold(gameFormat);
  const defaultFormationId = DEFAULT_FORMATION_FOR_FORMAT[gameFormat];

  // Formation & lineup
  const [formationId, setFormationId] = useState(defaultFormationId);
  const [assignments, setAssignments] = useState<Record<string, number>>({});
  const [bench, setBench] = useState<number[]>([]);

  // Role overrides per match
  const [roleOverrides, setRoleOverrides] = useState<Record<string, string>>({});
  const [editingRoleSlotId, setEditingRoleSlotId] = useState<string | null>(null);

  // Opponent traits
  const [opponentTraits, setOpponentTraits] = useState<string[]>([]);
  const [showOpponentProfile, setShowOpponentProfile] = useState(false);

  // Drag state
  const [dragPlayerId, setDragPlayerId] = useState<number | null>(null);
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);
  const [dragOriginSlotId, setDragOriginSlotId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Click-to-assign
  const [pendingAssignPlayerId, setPendingAssignPlayerId] = useState<number | null>(null);

  // Highlight
  const [highlightSlotId, setHighlightSlotId] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'roster' | 'bench' | 'details'>('roster');

  // Match details expanded (desktop inline)
  const [showMatchForm, setShowMatchForm] = useState(false);

  // Save feedback
  const [saveFlash, setSaveFlash] = useState(false);

  // Refs for hit testing
  const fieldRef = useRef<SVGSVGElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const rosterRef = useRef<HTMLDivElement | null>(null);

  // Reset formation when game format loads (only if no match selected)
  useEffect(() => {
    if (!selectedMatchId) {
      setFormationId(defaultFormationId);
    }
  }, [defaultFormationId, selectedMatchId]);

  // Load initial match when prop changes
  useEffect(() => {
    if (initialMatchId != null && matches.length > 0 && selectedMatchId !== initialMatchId) {
      loadMatch(initialMatchId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatchId, matches.length]);

  // Filter
  const [rosterFilter, setRosterFilter] = useState('');

  const formation = getFormation(formationId)!;

  // Derived
  const assignedPlayerIds = new Set([...Object.values(assignments), ...bench]);
  const availablePlayers = players.filter(p => !assignedPlayerIds.has(p.id!));
  const filteredRoster = availablePlayers.filter(p =>
    p.name.toLowerCase().includes(rosterFilter.toLowerCase()) ||
    String(p.jerseyNumber).includes(rosterFilter),
  );

  const filledSlots = formation.slots.filter(s => assignments[s.id] != null);
  const detectedFormation = filledSlots.length >= detectionThreshold ? detectFormation(filledSlots) : null;

  // Build roleTags Record (merge player defaults + per-match overrides)
  const roleTags = useMemo(() => {
    const tags: Record<string, string> = {};
    for (const [slotId, playerId] of Object.entries(assignments)) {
      if (roleOverrides[slotId]) {
        tags[slotId] = roleOverrides[slotId];
      } else {
        const player = players.find(p => p.id === playerId);
        if (player?.roleTag) {
          tags[slotId] = player.roleTag;
        }
      }
    }
    return tags;
  }, [assignments, roleOverrides, players]);

  // Lineup diff
  const lineupDiff = useMemo(() => {
    if (!selectedMatchId || Object.keys(assignments).length < Math.ceil(slotCount * 0.7)) return null;
    const currentMatch = matches.find(m => m.id === selectedMatchId);
    if (!currentMatch) return null;
    const previousMatches = matches
      .filter(m => m.id !== selectedMatchId && m.lineup && m.lineup.length > 0)
      .filter(m => String(m.date) < String(currentMatch.date))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (previousMatches.length === 0) return null;
    const prevMatch = previousMatches[0];
    const prevFormation = prevMatch.formation ? getFormation(prevMatch.formation) : null;
    const prevSlots: PositionSlot[] = prevFormation?.slots ?? formation.slots;
    const currentLineup: LineupEntry[] = Object.entries(assignments).map(
      ([slotId, playerId]) => ({ slotId, playerId }),
    );
    return compareLineups(currentLineup, prevMatch.lineup!, formation.slots, prevSlots);
  }, [selectedMatchId, assignments, matches, formation.slots, slotCount]);

  function loadMatch(matchId: number | null) {
    setSelectedMatchId(matchId);
    if (matchId == null) {
      setOpponent(''); setMatchDate(''); setMatchTime(''); setLocation('');
      setAssignments({}); setBench([]); setFormationId(defaultFormationId);
      setRoleOverrides({}); setOpponentTraits([]); setEditingRoleSlotId(null);
      setShowMatchForm(true);
      return;
    }
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    posthog.capture('match_opened');
    setOpponent(match.opponent);
    const rawDate = match.date as unknown;
    setMatchDate(rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(match.date));
    setMatchTime(match.time ?? '');
    setLocation(match.location ?? '');
    setBench(match.bench ?? []);
    if (match.formation && getFormation(match.formation)) {
      setFormationId(match.formation);
    } else {
      setFormationId(defaultFormationId);
    }
    const newAssignments: Record<string, number> = {};
    const newRoleOverrides: Record<string, string> = {};
    for (const entry of match.lineup ?? []) {
      newAssignments[entry.slotId] = entry.playerId;
      if (entry.roleTag) newRoleOverrides[entry.slotId] = entry.roleTag;
    }
    setAssignments(newAssignments);
    setRoleOverrides(newRoleOverrides);
    setOpponentTraits(match.opponentTraits ?? []);
    setEditingRoleSlotId(null);
    setShowMatchForm(false);
  }

  function changeFormation(newId: string) {
    const newFormation = getFormation(newId);
    if (!newFormation) return;
    const validSlotIds = new Set(newFormation.slots.map(s => s.id));
    setAssignments(prev => {
      const next: Record<string, number> = {};
      for (const [slotId, playerId] of Object.entries(prev)) {
        if (validSlotIds.has(slotId)) next[slotId] = playerId;
      }
      return next;
    });
    setRoleOverrides(prev => {
      const next: Record<string, string> = {};
      for (const [slotId, role] of Object.entries(prev)) {
        if (validSlotIds.has(slotId)) next[slotId] = role;
      }
      return next;
    });
    setFormationId(newId);
  }

  async function deleteMatch() {
    if (!selectedMatchId) return;
    if (!confirm('Delete this match? This cannot be undone.')) return;
    await db.matches.delete(selectedMatchId);
    loadMatch(null);
  }

  async function saveLineup() {
    if (!team?.id) return;
    const lineupEntries: LineupEntry[] = Object.entries(assignments).map(
      ([slotId, playerId]) => ({ slotId, playerId, roleTag: roleOverrides[slotId] || undefined }),
    );
    const detected = detectFormation(formation.slots.filter(s => assignments[s.id] != null));
    if (selectedMatchId) {
      await db.matches.update(selectedMatchId, {
        opponent, date: matchDate, time: matchTime, location: location || undefined,
        lineup: lineupEntries, bench, formation: detected || formationId,
        opponentTraits: opponentTraits.length > 0 ? opponentTraits : undefined,
      });
      posthog.capture('lineup_saved');
    } else {
      if (!opponent || !matchDate || !matchTime) return;
      const id = await db.matches.add({
        teamId: team.id, opponent, date: matchDate, time: matchTime,
        location: location || undefined, lineup: lineupEntries, bench,
        formation: detected || formationId,
        opponentTraits: opponentTraits.length > 0 ? opponentTraits : undefined,
      });
      setSelectedMatchId(id as number);
      posthog.capture('match_created');
      posthog.capture('lineup_saved');
    }
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }

  // === Drag and drop via pointer events ===
  const startDrag = useCallback((e: React.PointerEvent, playerId: number, origin: DragOrigin, slotId?: string) => {
    e.preventDefault();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragPlayerId(playerId); setDragOrigin(origin);
    setDragOriginSlotId(slotId ?? null);
    setDragPos({ x: e.clientX, y: e.clientY }); setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragPlayerId == null) return;
    const pos = { x: e.clientX, y: e.clientY };
    setDragPos(pos);
    if (!isDragging && dragStartPos.current) {
      const dx = pos.x - dragStartPos.current.x;
      const dy = pos.y - dragStartPos.current.y;
      if (Math.hypot(dx, dy) > 8) setIsDragging(true);
    }
    if (isDragging) {
      const slotId = hitTestSlot(pos.x, pos.y);
      setHighlightSlotId(slotId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPlayerId, isDragging]);

  const handlePointerUp = useCallback(() => {
    if (dragPlayerId == null) return;
    if (isDragging && dragPos) {
      const target = hitTestDrop(dragPos.x, dragPos.y);
      if (target === 'slot' && highlightSlotId) dropOnSlot(highlightSlotId);
      else if (target === 'bench') dropOnBench();
      else if (target === 'roster') dropOnRoster();
    }
    setDragPlayerId(null); setDragOrigin(null); setDragOriginSlotId(null);
    setDragPos(null); setIsDragging(false); setHighlightSlotId(null);
    dragStartPos.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPlayerId, isDragging, dragPos, highlightSlotId]);

  useEffect(() => {
    if (dragPlayerId == null) return;
    const onMove = (e: PointerEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      setDragPos(pos);
      if (!isDragging && dragStartPos.current) {
        const dx = pos.x - dragStartPos.current.x;
        const dy = pos.y - dragStartPos.current.y;
        if (Math.hypot(dx, dy) > 8) setIsDragging(true);
      }
      if (isDragging) setHighlightSlotId(hitTestSlot(pos.x, pos.y));
    };
    const onUp = () => {
      setDragPlayerId(null); setDragOrigin(null); setDragOriginSlotId(null);
      setDragPos(null); setIsDragging(false); setHighlightSlotId(null);
      dragStartPos.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPlayerId, isDragging]);

  function hitTestSlot(clientX: number, clientY: number): string | null {
    const svg = fieldRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = (1 - (clientY - rect.top) / rect.height) * 100;
    let closest: { slotId: string; dist: number } | null = null;
    for (const slot of formation.slots) {
      const dist = Math.hypot(slot.x - pctX, slot.y - pctY);
      if (dist < 10 && (!closest || dist < closest.dist)) closest = { slotId: slot.id, dist };
    }
    return closest?.slotId ?? null;
  }

  function hitTestDrop(clientX: number, clientY: number): 'slot' | 'bench' | 'roster' | null {
    if (hitTestSlot(clientX, clientY)) return 'slot';
    const svg = fieldRef.current;
    if (svg) {
      const r = svg.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return null;
    }
    const benchEl = benchRef.current;
    if (benchEl) {
      const r = benchEl.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return 'bench';
    }
    const rosterEl = rosterRef.current;
    if (rosterEl) {
      const r = rosterEl.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return 'roster';
    }
    return null;
  }

  function dropOnSlot(targetSlotId: string) {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    setAssignments(prev => {
      const next = { ...prev };
      const existing = next[targetSlotId];
      if (dragOrigin === 'field' && dragOriginSlotId) {
        delete next[dragOriginSlotId];
        if (existing != null && existing !== pid) next[dragOriginSlotId] = existing;
      }
      next[targetSlotId] = pid;
      return next;
    });
    if (dragOrigin === 'bench') setBench(b => b.filter(id => id !== pid));
  }

  function dropOnBench() {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    if (dragOrigin === 'field' && dragOriginSlotId) {
      setAssignments(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
    }
    setBench(prev => prev.includes(pid) ? prev : [...prev, pid]);
  }

  function dropOnRoster() {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    if (dragOrigin === 'field' && dragOriginSlotId) {
      setAssignments(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
    }
    if (dragOrigin === 'bench') setBench(prev => prev.filter(id => id !== pid));
  }

  function handlePlayerClick(playerId: number) {
    if (isDragging) return;
    setPendingAssignPlayerId(prev => prev === playerId ? null : playerId);
  }

  function handleSlotClick(slotId: string) {
    if (pendingAssignPlayerId != null) {
      const pid = pendingAssignPlayerId;
      setBench(prev => prev.filter(id => id !== pid));
      setAssignments(prev => {
        const next = { ...prev };
        for (const [sid, id] of Object.entries(next)) { if (id === pid) delete next[sid]; }
        next[slotId] = pid;
        return next;
      });
      setPendingAssignPlayerId(null);
      return;
    }
    const pid = assignments[slotId];
    if (pid != null) setPendingAssignPlayerId(pid);
  }

  function handleSlotPointerDown(e: React.PointerEvent, slotId: string) {
    const pid = assignments[slotId];
    if (pid == null) return;
    e.stopPropagation();
    startDrag(e, pid, 'field', slotId);
  }

  function handleSlotDoubleClick(slotId: string) {
    if (assignments[slotId] == null) return;
    setEditingRoleSlotId(prev => prev === slotId ? null : slotId);
  }

  function PlayerCard({ player, origin }: { player: Player; origin: DragOrigin }) {
    const isBeingDragged = isDragging && dragPlayerId === player.id;
    const isPending = pendingAssignPlayerId === player.id;
    return (
      <div
        onPointerDown={(e) => startDrag(e, player.id!, origin)}
        onClick={() => handlePlayerClick(player.id!)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg select-none transition-colors ${
          isBeingDragged
            ? 'opacity-30'
            : isPending
              ? 'bg-accent/20 border border-accent/40 ring-1 ring-accent/30'
              : 'bg-surface-3 hover:bg-surface-4 cursor-grab active:cursor-grabbing'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs font-bold shrink-0">
          {player.jerseyNumber}
        </div>
        <span className="text-sm text-txt truncate">{player.name}</span>
        {player.roleTag && (
          <span className="ml-auto text-[10px] text-accent/70 truncate">{player.roleTag}</span>
        )}
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-txt-muted">
        <p>Create a team first in the Team tab.</p>
      </div>
    );
  }

  const sortedMatches = [...matches].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const assignedCount = Object.keys(assignments).length;
  const canSave = opponent && matchDate && matchTime;

  return (
    <div
      className="flex flex-col select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Back to Match button */}
        {onBackToMatch && selectedMatchId && (
          <button
            onClick={() => onBackToMatch(selectedMatchId)}
            className="text-sm text-txt-muted hover:text-accent transition-colors mr-1"
          >
            &larr; Back to Match
          </button>
        )}

        {/* Match selector */}
        <Select
          value={selectedMatchId ?? ''}
          onChange={(e) => loadMatch(e.target.value ? Number(e.target.value) : null)}
          className="flex-1 min-w-0 sm:flex-none sm:w-56"
        >
          <option value="">+ New Match</option>
          {sortedMatches.map(m => {
            const raw = m.date as unknown;
            const dateStr = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(m.date);
            return (
              <option key={m.id} value={m.id}>{dateStr} vs {m.opponent}</option>
            );
          })}
        </Select>

        {/* Formation picker */}
        <Select value={formationId} onChange={e => changeFormation(e.target.value)} className="w-auto">
          {formatFormations.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
        </Select>

        {/* Counter + detected */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-faint font-mono">{assignedCount}/{slotCount}</span>
          {detectedFormation && (
            <span className="text-sm text-accent font-mono font-bold">{detectedFormation}</span>
          )}
        </div>

        {/* Lineup diff badge */}
        {lineupDiff?.message && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium hidden sm:inline ${
            lineupDiff.newSpine ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20'
          }`}>{lineupDiff.message}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle match details */}
          <button
            onClick={() => setShowMatchForm(!showMatchForm)}
            className={`text-xs px-2 py-1 rounded transition-colors ${showMatchForm ? 'bg-surface-3 text-accent' : 'text-txt-faint hover:text-txt'}`}
          >
            {showMatchForm ? 'Hide Details' : 'Match Info'}
          </button>

          {/* Roster drawer toggle */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              drawerOpen ? 'bg-accent text-surface-1 font-semibold' : 'bg-surface-3 text-txt hover:bg-surface-4'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Squad
          </button>

          {/* Export */}
          <Button
            variant="secondary"
            onClick={async () => {
              if (!fieldRef.current) return;
              await exportLineupPng({
                fieldSvg: fieldRef.current,
                opponent,
                matchDate,
                formation: detectedFormation,
              });
            }}
            disabled={Object.keys(assignments).length === 0}
            className="px-3"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5 -mt-px">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </Button>

          {/* Save */}
          <Button
            onClick={saveLineup}
            disabled={!canSave}
            className={`px-4 transition-all ${saveFlash ? '!bg-emerald-500 !text-white' : ''}`}
          >
            {saveFlash ? 'Saved!' : selectedMatchId ? 'Save' : 'Create & Save'}
          </Button>
        </div>
      </div>

      {/* ═══ MATCH DETAILS (collapsible) ═══ */}
      {showMatchForm && (
        <div className="bg-surface-1 rounded-lg border border-surface-5 p-3 mb-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input type="text" placeholder="Opponent" value={opponent} onChange={e => setOpponent(e.target.value)} />
            <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            <Input type="time" value={matchTime} onChange={e => setMatchTime(e.target.value)} />
            <Input type="text" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          {/* Opponent Profile */}
          <div>
            <button onClick={() => setShowOpponentProfile(!showOpponentProfile)} className="flex items-center gap-2 text-sm text-txt-muted hover:text-txt transition-colors">
              <span>{showOpponentProfile ? '▾' : '▸'}</span>
              <span>Opponent Profile</span>
              {opponentTraits.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">{opponentTraits.length}</span>
              )}
            </button>
            {showOpponentProfile && (
              <div className="mt-2">
                <TagPicker label="Scouting traits (up to 5)" options={OPPONENT_TRAITS} selected={opponentTraits} onChange={setOpponentTraits} max={5} allowCustom />
              </div>
            )}
            {!showOpponentProfile && opponentTraits.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {opponentTraits.map(trait => (
                  <span key={trait} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">{trait}</span>
                ))}
              </div>
            )}
          </div>

          {selectedMatchId && (
            <button onClick={deleteMatch} className="text-xs text-txt-faint hover:text-red-400 transition-colors">
              Delete Match
            </button>
          )}
        </div>
      )}

      {/* ═══ MAIN AREA: PITCH + DRAWER ═══ */}
      <div className="flex gap-3 relative">
        {/* PITCH (fills remaining space) */}
        <div className="flex-1 min-w-0">
          <div className="bg-surface-1 rounded-lg border border-surface-5 p-2 sm:p-3">
            <SoccerField
              formation={formation} assignments={assignments} players={players}
              detectedFormation={detectedFormation} highlightSlotId={highlightSlotId}
              onSlotPointerDown={handleSlotPointerDown} onSlotClick={handleSlotClick}
              onSlotDoubleClick={handleSlotDoubleClick} pendingAssign={pendingAssignPlayerId != null}
              fieldRef={fieldRef} roleTags={roleTags}
            />

            {/* Role picker inline */}
            {editingRoleSlotId && assignments[editingRoleSlotId] != null && (() => {
              const slotPlayer = players.find(p => p.id === assignments[editingRoleSlotId]);
              const slotInfo = formation.slots.find(s => s.id === editingRoleSlotId);
              return (
                <div className="mt-2 p-3 rounded-lg bg-surface-2 border border-surface-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-txt-muted">Role for #{slotPlayer?.jerseyNumber} {slotPlayer?.name} ({slotInfo?.label})</span>
                    <button onClick={() => setEditingRoleSlotId(null)} className="text-xs text-txt-faint hover:text-txt transition-colors">✕</button>
                  </div>
                  <RolePicker
                    value={roleOverrides[editingRoleSlotId] ?? slotPlayer?.roleTag}
                    onChange={(role) => {
                      setRoleOverrides(prev => {
                        const next = { ...prev };
                        if (role) next[editingRoleSlotId] = role;
                        else delete next[editingRoleSlotId];
                        return next;
                      });
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* BENCH (always visible below field) */}
          <div ref={benchRef} className="mt-3 bg-surface-1 rounded-lg border border-surface-5 p-3">
            <h3 className="text-xs font-semibold text-txt-muted mb-2 uppercase tracking-wider">Bench ({bench.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {bench.map(id => {
                const p = players.find(pl => pl.id === id);
                return p ? (
                  <div
                    key={p.id}
                    onPointerDown={(e) => startDrag(e, p.id!, 'bench')}
                    onClick={() => handlePlayerClick(p.id!)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg select-none transition-colors text-sm ${
                      (isDragging && dragPlayerId === p.id) ? 'opacity-30' :
                      pendingAssignPlayerId === p.id ? 'bg-accent/20 border border-accent/40' :
                      'bg-surface-3 hover:bg-surface-4 cursor-grab'
                    }`}
                    style={{ touchAction: 'none' }}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-[10px] font-bold">
                      {p.jerseyNumber}
                    </div>
                    <span className="text-txt text-xs truncate">{p.name.split(' ').pop()}</span>
                  </div>
                ) : null;
              })}
              {bench.length === 0 && (
                <p className="text-xs text-txt-faint py-1">Drag players here for the bench</p>
              )}
            </div>
          </div>
        </div>

        {/* ═══ ROSTER DRAWER ═══ */}
        {/* Desktop: side panel */}
        {drawerOpen && (
          <div ref={rosterRef} className="hidden lg:flex flex-col w-56 shrink-0 bg-surface-1 rounded-lg border border-surface-5 p-3 max-h-[calc(100vh-200px)] sticky top-4">
            {/* Tabs */}
            <div className="flex border-b border-surface-5 mb-3 -mx-3 px-3">
              <button
                onClick={() => setDrawerTab('roster')}
                className={`flex-1 pb-2 text-xs font-medium transition-colors ${drawerTab === 'roster' ? 'text-accent border-b-2 border-accent' : 'text-txt-muted'}`}
              >
                Available ({availablePlayers.length})
              </button>
              <button
                onClick={() => setDrawerTab('details')}
                className={`flex-1 pb-2 text-xs font-medium transition-colors ${drawerTab === 'details' ? 'text-accent border-b-2 border-accent' : 'text-txt-muted'}`}
              >
                Info
              </button>
            </div>

            {drawerTab === 'roster' && (
              <>
                <Input type="text" placeholder="Search..." value={rosterFilter} onChange={e => setRosterFilter(e.target.value)} className="mb-2" />
                <div className="overflow-y-auto space-y-1 flex-1">
                  {filteredRoster.map(p => (<PlayerCard key={p.id} player={p} origin="roster" />))}
                  {filteredRoster.length === 0 && (
                    <p className="text-xs text-txt-faint text-center py-4">{players.length === 0 ? 'Add players in Team tab' : 'All players assigned'}</p>
                  )}
                </div>
              </>
            )}

            {drawerTab === 'details' && (
              <div className="overflow-y-auto space-y-3 flex-1 text-xs">
                <div>
                  <span className="text-txt-faint">Opponent:</span>
                  <span className="text-txt ml-1">{opponent || '—'}</span>
                </div>
                <div>
                  <span className="text-txt-faint">Date:</span>
                  <span className="text-txt ml-1">{matchDate || '—'}</span>
                </div>
                <div>
                  <span className="text-txt-faint">Time:</span>
                  <span className="text-txt ml-1">{matchTime || '—'}</span>
                </div>
                <div>
                  <span className="text-txt-faint">Location:</span>
                  <span className="text-txt ml-1">{location || '—'}</span>
                </div>
                {opponentTraits.length > 0 && (
                  <div>
                    <span className="text-txt-faint block mb-1">Scouting:</span>
                    <div className="flex flex-wrap gap-1">
                      {opponentTraits.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded-full text-[10px] bg-accent/10 text-accent border border-accent/20">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile: slide-up drawer */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-1 border-t border-surface-5 rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-surface-5" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-surface-5">
              <div className="flex gap-4">
                <button
                  onClick={() => setDrawerTab('roster')}
                  className={`text-sm font-medium transition-colors ${drawerTab === 'roster' ? 'text-accent' : 'text-txt-muted'}`}
                >
                  Available ({availablePlayers.length})
                </button>
                <button
                  onClick={() => setDrawerTab('bench')}
                  className={`text-sm font-medium transition-colors ${drawerTab === 'bench' ? 'text-accent' : 'text-txt-muted'}`}
                >
                  Bench ({bench.length})
                </button>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-txt-faint hover:text-txt text-sm p-1">✕</button>
            </div>

            {/* Content */}
            <div ref={drawerOpen ? rosterRef : undefined} className="overflow-y-auto flex-1 p-3">
              {drawerTab === 'roster' && (
                <>
                  <Input type="text" placeholder="Search players..." value={rosterFilter} onChange={e => setRosterFilter(e.target.value)} className="mb-2" />
                  <div className="space-y-1">
                    {filteredRoster.map(p => (<PlayerCard key={p.id} player={p} origin="roster" />))}
                    {filteredRoster.length === 0 && (
                      <p className="text-xs text-txt-faint text-center py-4">{players.length === 0 ? 'Add players in Team tab' : 'All players assigned'}</p>
                    )}
                  </div>
                </>
              )}
              {drawerTab === 'bench' && (
                <div className="space-y-1">
                  {bench.map(id => {
                    const p = players.find(pl => pl.id === id);
                    return p ? <PlayerCard key={p.id} player={p} origin="bench" /> : null;
                  })}
                  {bench.length === 0 && (
                    <p className="text-xs text-txt-faint text-center py-4">Drag players here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag ghost */}
      {isDragging && dragPlayerId != null && dragPos && (
        <div className="fixed pointer-events-none z-50" style={{ left: dragPos.x - 20, top: dragPos.y - 20 }}>
          <div className="w-10 h-10 rounded-full bg-accent border-2 border-white flex items-center justify-center text-surface-1 font-bold text-sm shadow-lg shadow-accent/30">
            {players.find(p => p.id === dragPlayerId)?.jerseyNumber ?? '?'}
          </div>
        </div>
      )}
    </div>
  );
}
