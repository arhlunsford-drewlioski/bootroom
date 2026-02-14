import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Player, LineupEntry, LineupTemplate } from '../db/database';
import { posthog } from '../analytics';
import SoccerField from './SoccerField';
import { getFormationsForFormat, DEFAULT_FORMATION_FOR_FORMAT, FORMAT_SLOT_COUNT, getDetectionThreshold, getFormation, detectFormation, tierFromY } from './formations';
import type { PositionSlot } from './formations';
import { OPPONENT_TRAITS } from '../constants/tags';
import { compareLineups } from '../utils/lineup-diff';
import { exportLineupPng } from '../utils/export-image';
import { to12Hour } from '../utils/time';
import RolePicker from './ui/RolePicker';
import TagPicker from './ui/TagPicker';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import TimePicker from './ui/TimePicker';
import ConfirmDialog from './ui/ConfirmDialog';

type DragOrigin = 'roster' | 'bench' | 'field';

interface LineupCreatorProps {
  /** When set, opens the builder for this match's lineup */
  initialMatchId?: number | null;
  /** Callback to go back to the match detail modal */
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
  const templates = useLiveQuery(
    () => (team?.id ? db.lineupTemplates.where('teamId').equals(team.id).toArray() : []),
    [team?.id],
  ) ?? [];

  // Mode: 'library' (default) or 'builder' (editing a lineup)
  const [mode, setMode] = useState<'library' | 'builder'>(initialMatchId ? 'builder' : 'library');

  // Template being edited (null = match lineup or new template)
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');

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

  // Freeform positions & labels
  const [freeformPositions, setFreeformPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [freeformLabels, setFreeformLabels] = useState<Record<string, string>>({});
  const freeformCounter = useRef(0);
  const [highlightDropPos, setHighlightDropPos] = useState<{ x: number; y: number } | null>(null);

  // Tactical lines
  const [defensiveLine, setDefensiveLine] = useState<number | undefined>(undefined);
  const [pressingLine, setPressingLine] = useState<number | undefined>(undefined);
  const [showTacticalLines, setShowTacticalLines] = useState(false);

  // Drawer state (open by default so roster is visible)
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'roster' | 'bench' | 'details'>('roster');

  // Match details expanded (desktop inline)
  const [showMatchForm, setShowMatchForm] = useState(false);

  // Save feedback
  const [saveFlash, setSaveFlash] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'match' | 'template'>('match');

  // Refs for hit testing
  const fieldRef = useRef<SVGSVGElement | null>(null);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const rosterRef = useRef<HTMLDivElement | null>(null);

  // Reset formation when game format loads (only if no match selected)
  useEffect(() => {
    if (!selectedMatchId && !editingTemplateId) {
      setFormationId(defaultFormationId);
    }
  }, [defaultFormationId, selectedMatchId, editingTemplateId]);

  // Load initial match when prop changes
  useEffect(() => {
    if (initialMatchId != null && matches.length > 0 && selectedMatchId !== initialMatchId) {
      loadMatch(initialMatchId);
      setMode('builder');
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

  // Resolve positions: freeform overrides > formation slot coords
  const resolvedPositions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {};
    for (const slotId of Object.keys(assignments)) {
      if (freeformPositions[slotId]) {
        result[slotId] = freeformPositions[slotId];
      } else {
        const slot = formation.slots.find(s => s.id === slotId);
        if (slot) result[slotId] = { x: slot.x, y: slot.y };
      }
    }
    return result;
  }, [assignments, freeformPositions, formation.slots]);

  // Resolve labels: freeform labels > formation slot labels
  const resolvedLabels = useMemo(() => {
    const result: Record<string, string> = {};
    for (const slotId of Object.keys(assignments)) {
      if (freeformLabels[slotId]) {
        result[slotId] = freeformLabels[slotId];
      } else {
        const slot = formation.slots.find(s => s.id === slotId);
        if (slot) result[slotId] = slot.label;
      }
    }
    return result;
  }, [assignments, freeformLabels, formation.slots]);

  // Build virtual PositionSlots for all assigned players (formation + freeform) for detection
  const allFilledSlots: PositionSlot[] = useMemo(() => {
    return Object.keys(assignments).map(slotId => {
      const formationSlot = formation.slots.find(s => s.id === slotId);
      if (formationSlot) return formationSlot;
      const pos = freeformPositions[slotId];
      const label = freeformLabels[slotId] ?? '';
      return {
        id: slotId,
        label,
        tier: pos ? tierFromY(pos.y) : 'MID' as const,
        x: pos?.x ?? 50,
        y: pos?.y ?? 50,
      };
    });
  }, [assignments, formation.slots, freeformPositions, freeformLabels]);

  const detectedFormation = allFilledSlots.length >= detectionThreshold ? detectFormation(allFilledSlots) : null;

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
    return compareLineups(currentLineup, prevMatch.lineup!, allFilledSlots, prevSlots);
  }, [selectedMatchId, assignments, matches, allFilledSlots, slotCount]);

  function loadMatch(matchId: number | null) {
    setSelectedMatchId(matchId);
    setEditingTemplateId(null);
    if (matchId == null) {
      setOpponent(''); setMatchDate(''); setMatchTime(''); setLocation('');
      setAssignments({}); setBench([]); setFormationId(defaultFormationId);
      setRoleOverrides({}); setOpponentTraits([]); setEditingRoleSlotId(null);
      setFreeformPositions({}); setFreeformLabels({});
      setDefensiveLine(undefined); setPressingLine(undefined); setShowTacticalLines(false);
      freeformCounter.current = 0;
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
    const newFreeformPositions: Record<string, { x: number; y: number }> = {};
    const newFreeformLabels: Record<string, string> = {};
    let maxFreeCounter = 0;
    for (const entry of match.lineup ?? []) {
      newAssignments[entry.slotId] = entry.playerId;
      if (entry.roleTag) newRoleOverrides[entry.slotId] = entry.roleTag;
      if (entry.x != null && entry.y != null) {
        newFreeformPositions[entry.slotId] = { x: entry.x, y: entry.y };
      }
      if (entry.label) {
        newFreeformLabels[entry.slotId] = entry.label;
      }
      if (entry.slotId.startsWith('free-')) {
        const num = parseInt(entry.slotId.slice(5), 10);
        if (!isNaN(num) && num >= maxFreeCounter) maxFreeCounter = num + 1;
      }
    }
    freeformCounter.current = maxFreeCounter;
    setAssignments(newAssignments);
    setRoleOverrides(newRoleOverrides);
    setFreeformPositions(newFreeformPositions);
    setFreeformLabels(newFreeformLabels);
    setOpponentTraits(match.opponentTraits ?? []);
    setDefensiveLine(match.defensiveLine);
    setPressingLine(match.pressingLine);
    setShowTacticalLines(match.defensiveLine != null || match.pressingLine != null);
    setEditingRoleSlotId(null);
    setShowMatchForm(false);
  }

  function loadTemplate(template: LineupTemplate) {
    setEditingTemplateId(template.id ?? null);
    setSelectedMatchId(null);
    setTemplateName(template.name);
    if (template.formation && getFormation(template.formation)) {
      setFormationId(template.formation);
    } else {
      setFormationId(defaultFormationId);
    }
    const newAssignments: Record<string, number> = {};
    const newRoleOverrides: Record<string, string> = {};
    const newFreeformPositions: Record<string, { x: number; y: number }> = {};
    const newFreeformLabels: Record<string, string> = {};
    let maxFreeCounter = 0;
    for (const entry of template.positions ?? []) {
      newAssignments[entry.slotId] = entry.playerId;
      if (entry.roleTag) newRoleOverrides[entry.slotId] = entry.roleTag;
      if (entry.x != null && entry.y != null) {
        newFreeformPositions[entry.slotId] = { x: entry.x, y: entry.y };
      }
      if (entry.label) {
        newFreeformLabels[entry.slotId] = entry.label;
      }
      if (entry.slotId.startsWith('free-')) {
        const num = parseInt(entry.slotId.slice(5), 10);
        if (!isNaN(num) && num >= maxFreeCounter) maxFreeCounter = num + 1;
      }
    }
    freeformCounter.current = maxFreeCounter;
    setAssignments(newAssignments);
    setRoleOverrides(newRoleOverrides);
    setFreeformPositions(newFreeformPositions);
    setFreeformLabels(newFreeformLabels);
    setBench(template.bench ?? []);
    setDefensiveLine(template.defensiveLine);
    setPressingLine(template.pressingLine);
    setShowTacticalLines(template.defensiveLine != null || template.pressingLine != null);
    setOpponent(''); setMatchDate(''); setMatchTime(''); setLocation('');
    setOpponentTraits([]);
    setEditingRoleSlotId(null);
    setShowMatchForm(false);
    setMode('builder');
  }

  function startNewTemplate() {
    setEditingTemplateId(null);
    setSelectedMatchId(null);
    setTemplateName('');
    setOpponent(''); setMatchDate(''); setMatchTime(''); setLocation('');
    setAssignments({}); setBench([]); setFormationId(defaultFormationId);
    setRoleOverrides({}); setOpponentTraits([]); setEditingRoleSlotId(null);
    setFreeformPositions({}); setFreeformLabels({});
    setDefensiveLine(undefined); setPressingLine(undefined); setShowTacticalLines(false);
    freeformCounter.current = 0;
    setShowMatchForm(false);
    setMode('builder');
  }

  function changeFormation(newId: string) {
    const newFormation = getFormation(newId);
    if (!newFormation) return;
    const newSlotIds = new Set(newFormation.slots.map(s => s.id));

    const nextAssignments: Record<string, number> = {};
    const nextFreeformPositions = { ...freeformPositions };
    const nextFreeformLabels = { ...freeformLabels };
    const nextRoleOverrides: Record<string, string> = {};

    for (const [slotId, playerId] of Object.entries(assignments)) {
      if (newSlotIds.has(slotId)) {
        // Slot exists in new formation — keep it
        nextAssignments[slotId] = playerId;
        if (roleOverrides[slotId]) nextRoleOverrides[slotId] = roleOverrides[slotId];
      } else if (freeformPositions[slotId]) {
        // Already freeform — keep as-is
        nextAssignments[slotId] = playerId;
        if (roleOverrides[slotId]) nextRoleOverrides[slotId] = roleOverrides[slotId];
      } else {
        // Was a formation slot that no longer exists — convert to freeform at old coords
        const oldSlot = formation.slots.find(s => s.id === slotId);
        if (oldSlot) {
          const freeId = `free-${freeformCounter.current++}`;
          nextAssignments[freeId] = playerId;
          nextFreeformPositions[freeId] = { x: oldSlot.x, y: oldSlot.y };
          nextFreeformLabels[freeId] = oldSlot.label;
          if (roleOverrides[slotId]) nextRoleOverrides[freeId] = roleOverrides[slotId];
        }
      }
    }

    // Clean up freeform data for slots that are no longer assigned
    for (const slotId of Object.keys(nextFreeformPositions)) {
      if (!(slotId in nextAssignments)) {
        delete nextFreeformPositions[slotId];
        delete nextFreeformLabels[slotId];
      }
    }

    setAssignments(nextAssignments);
    setFreeformPositions(nextFreeformPositions);
    setFreeformLabels(nextFreeformLabels);
    setRoleOverrides(nextRoleOverrides);
    setFormationId(newId);
  }

  function deleteMatch() {
    if (!selectedMatchId) return;
    setDeleteTarget('match');
    setShowDeleteConfirm(true);
  }

  function deleteTemplate() {
    if (!editingTemplateId) return;
    setDeleteTarget('template');
    setShowDeleteConfirm(true);
  }

  async function confirmDelete() {
    if (deleteTarget === 'match' && selectedMatchId) {
      await db.matches.delete(selectedMatchId);
      setShowDeleteConfirm(false);
      loadMatch(null);
      setMode('library');
    } else if (deleteTarget === 'template' && editingTemplateId) {
      await db.lineupTemplates.delete(editingTemplateId);
      setShowDeleteConfirm(false);
      setEditingTemplateId(null);
      setMode('library');
    }
  }

  async function saveLineup() {
    if (!team?.id) return;
    const lineupEntries: LineupEntry[] = Object.entries(assignments).map(
      ([slotId, playerId]) => {
        const entry: LineupEntry = { slotId, playerId, roleTag: roleOverrides[slotId] || undefined };
        const fp = freeformPositions[slotId];
        if (fp) {
          entry.x = Math.round(fp.x * 10) / 10;
          entry.y = Math.round(fp.y * 10) / 10;
        }
        if (freeformLabels[slotId]) {
          entry.label = freeformLabels[slotId];
        }
        return entry;
      },
    );
    const detected = detectedFormation;

    if (selectedMatchId) {
      await db.matches.update(selectedMatchId, {
        opponent, date: matchDate, time: matchTime, location: location || undefined,
        lineup: lineupEntries, bench, formation: detected || formationId,
        opponentTraits: opponentTraits.length > 0 ? opponentTraits : undefined,
        defensiveLine: showTacticalLines ? defensiveLine : undefined,
        pressingLine: showTacticalLines ? pressingLine : undefined,
      });
      posthog.capture('lineup_saved');
    } else if (editingTemplateId) {
      await db.lineupTemplates.update(editingTemplateId, {
        name: templateName || `${detected || formationId} Template`,
        formation: detected || formationId,
        positions: lineupEntries,
        bench,
        defensiveLine: showTacticalLines ? defensiveLine : undefined,
        pressingLine: showTacticalLines ? pressingLine : undefined,
      });
    } else if (templateName || Object.keys(assignments).length > 0) {
      const name = templateName || `${detected || formationId} Template`;
      const id = await db.lineupTemplates.add({
        teamId: team.id,
        name,
        formation: detected || formationId,
        positions: lineupEntries,
        bench,
        defensiveLine: showTacticalLines ? defensiveLine : undefined,
        pressingLine: showTacticalLines ? pressingLine : undefined,
        createdAt: new Date().toISOString(),
      });
      setEditingTemplateId(id as number);
    }

    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }

  async function saveMatchLineupAsTemplate() {
    if (!team?.id || !selectedMatchId) return;
    const lineupEntries: LineupEntry[] = Object.entries(assignments).map(
      ([slotId, playerId]) => {
        const entry: LineupEntry = { slotId, playerId, roleTag: roleOverrides[slotId] || undefined };
        const fp = freeformPositions[slotId];
        if (fp) {
          entry.x = Math.round(fp.x * 10) / 10;
          entry.y = Math.round(fp.y * 10) / 10;
        }
        if (freeformLabels[slotId]) entry.label = freeformLabels[slotId];
        return entry;
      },
    );
    const detected = detectedFormation;
    const name = `${opponent} ${matchDate} (${detected || formationId})`;
    await db.lineupTemplates.add({
      teamId: team.id,
      name,
      formation: detected || formationId,
      positions: lineupEntries,
      bench,
      matchId: selectedMatchId,
      defensiveLine: showTacticalLines ? defensiveLine : undefined,
      pressingLine: showTacticalLines ? pressingLine : undefined,
      createdAt: new Date().toISOString(),
    });
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
      const result = hitTestField(pos.x, pos.y);
      if (result?.type === 'slot') {
        setHighlightSlotId(result.slotId);
        setHighlightDropPos(null);
      } else if (result?.type === 'freeform') {
        setHighlightSlotId(null);
        setHighlightDropPos({ x: result.x, y: result.y });
      } else {
        setHighlightSlotId(null);
        setHighlightDropPos(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPlayerId, isDragging]);

  const handlePointerUp = useCallback(() => {
    if (dragPlayerId == null) return;
    if (isDragging && dragPos) {
      const fieldResult = hitTestField(dragPos.x, dragPos.y);
      if (fieldResult?.type === 'slot') {
        dropOnSlot(fieldResult.slotId);
      } else if (fieldResult?.type === 'freeform') {
        dropOnFreeform(fieldResult.x, fieldResult.y);
      } else {
        const zone = hitTestDropZone(dragPos.x, dragPos.y);
        if (zone === 'bench') dropOnBench();
        else if (zone === 'roster') dropOnRoster();
      }
    }
    setDragPlayerId(null); setDragOrigin(null); setDragOriginSlotId(null);
    setDragPos(null); setIsDragging(false);
    setHighlightSlotId(null); setHighlightDropPos(null);
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
      if (isDragging) {
        const result = hitTestField(pos.x, pos.y);
        if (result?.type === 'slot') {
          setHighlightSlotId(result.slotId);
          setHighlightDropPos(null);
        } else if (result?.type === 'freeform') {
          setHighlightSlotId(null);
          setHighlightDropPos({ x: result.x, y: result.y });
        } else {
          setHighlightSlotId(null);
          setHighlightDropPos(null);
        }
      }
    };
    const onUp = () => {
      setDragPlayerId(null); setDragOrigin(null); setDragOriginSlotId(null);
      setDragPos(null); setIsDragging(false);
      setHighlightSlotId(null); setHighlightDropPos(null);
      dragStartPos.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragPlayerId, isDragging]);

  type HitTestResult =
    | { type: 'slot'; slotId: string }
    | { type: 'freeform'; x: number; y: number }
    | null;

  function hitTestField(clientX: number, clientY: number): HitTestResult {
    const svg = fieldRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const pctX = ((clientX - rect.left) / rect.width) * 100;
    const pctY = (1 - (clientY - rect.top) / rect.height) * 100;

    // Check formation slots first (snap zone = 8 units)
    let closest: { slotId: string; dist: number } | null = null;
    for (const slot of formation.slots) {
      const dist = Math.hypot(slot.x - pctX, slot.y - pctY);
      if (dist < 8 && (!closest || dist < closest.dist)) closest = { slotId: slot.id, dist };
    }
    if (closest) return { type: 'slot', slotId: closest.slotId };

    // Freeform: anywhere on the field
    return { type: 'freeform', x: pctX, y: pctY };
  }

  function hitTestDropZone(clientX: number, clientY: number): 'bench' | 'roster' | null {
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
    // Clean up freeform data if dropping onto a formation slot
    if (dragOrigin === 'field' && dragOriginSlotId) {
      setFreeformPositions(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
      setFreeformLabels(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
    }
    if (dragOrigin === 'bench') setBench(b => b.filter(id => id !== pid));
  }

  function dropOnFreeform(x: number, y: number) {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    const newSlotId = `free-${freeformCounter.current++}`;

    // Determine label: carry from previous slot
    let label = '';
    if (dragOrigin === 'field' && dragOriginSlotId) {
      label = freeformLabels[dragOriginSlotId] ?? formation.slots.find(s => s.id === dragOriginSlotId)?.label ?? '';
    }

    setAssignments(prev => {
      const next = { ...prev };
      if (dragOrigin === 'field' && dragOriginSlotId) {
        delete next[dragOriginSlotId];
      }
      next[newSlotId] = pid;
      return next;
    });
    setFreeformPositions(prev => {
      const next = { ...prev };
      if (dragOriginSlotId) delete next[dragOriginSlotId];
      next[newSlotId] = { x, y };
      return next;
    });
    setFreeformLabels(prev => {
      const next = { ...prev };
      if (dragOriginSlotId) delete next[dragOriginSlotId];
      if (label) next[newSlotId] = label;
      return next;
    });
    if (roleOverrides[dragOriginSlotId ?? '']) {
      setRoleOverrides(prev => {
        const next = { ...prev };
        const old = dragOriginSlotId ? next[dragOriginSlotId] : undefined;
        if (dragOriginSlotId) delete next[dragOriginSlotId];
        if (old) next[newSlotId] = old;
        return next;
      });
    }
    if (dragOrigin === 'bench') setBench(b => b.filter(id => id !== pid));
  }

  function dropOnBench() {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    if (dragOrigin === 'field' && dragOriginSlotId) {
      setAssignments(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
      setFreeformPositions(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
      setFreeformLabels(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
    }
    setBench(prev => prev.includes(pid) ? prev : [...prev, pid]);
  }

  function dropOnRoster() {
    if (dragPlayerId == null) return;
    const pid = dragPlayerId;
    if (dragOrigin === 'field' && dragOriginSlotId) {
      setAssignments(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
      setFreeformPositions(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
      setFreeformLabels(prev => { const n = { ...prev }; delete n[dragOriginSlotId!]; return n; });
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
      // If clicking the same slot the pending player is already in, just deselect
      if (assignments[slotId] === pid) {
        setPendingAssignPlayerId(null);
        return;
      }
      setBench(prev => prev.filter(id => id !== pid));
      // Remove player from any previous slot (including freeform cleanup)
      setAssignments(prev => {
        const next = { ...prev };
        for (const [sid, id] of Object.entries(next)) {
          if (id === pid) {
            delete next[sid];
            // Clean up freeform data for old slot
            setFreeformPositions(fp => { const n = { ...fp }; delete n[sid]; return n; });
            setFreeformLabels(fl => { const n = { ...fl }; delete n[sid]; return n; });
          }
        }
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
              : 'bg-surface-2 border border-surface-5 hover:bg-surface-3 cursor-grab active:cursor-grabbing'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className="w-8 h-8 rounded-full bg-accent text-surface-0 flex items-center justify-center text-xs font-bold shrink-0">
          {player.jerseyNumber}
        </div>
        <span className="text-sm font-medium text-txt truncate">{player.name}</span>
        {player.roleTag && (
          <span className="ml-auto text-[10px] font-medium text-txt-muted truncate">{player.roleTag}</span>
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

  // ════════════════════════════════════════
  // LIBRARY VIEW
  // ════════════════════════════════════════
  if (mode === 'library') {
    const sortedTemplates = [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-txt tracking-wide font-display">LINEUPS</h2>
          <Button onClick={startNewTemplate}>+ Create Lineup</Button>
        </div>

        {sortedTemplates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-txt-faint text-sm mb-2">No saved lineups yet.</p>
            <p className="text-txt-faint text-xs mb-4">Create a lineup template to reuse across matches.</p>
            <Button onClick={startNewTemplate}>+ Create Lineup</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTemplates.map(t => {
              const linkedMatch = t.matchId ? matches.find(m => m.id === t.matchId) : null;
              return (
                <div
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  className="bg-surface-1 rounded-lg border border-surface-5 hover:border-surface-4 transition-colors cursor-pointer px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-txt truncate">{t.name}</span>
                        <span className="text-[10px] text-accent font-mono font-bold">{t.formation}</span>
                      </div>
                      <div className="text-[10px] text-txt-faint mt-1 flex items-center gap-2">
                        <span>{t.positions.length} players</span>
                        {t.bench && t.bench.length > 0 && (
                          <span>+ {t.bench.length} bench</span>
                        )}
                        {linkedMatch && (
                          <span className="text-accent/60">
                            from vs {linkedMatch.opponent}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-txt-faint shrink-0">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // BUILDER VIEW
  // ════════════════════════════════════════
  const sortedMatches = [...matches].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const assignedCount = Object.keys(assignments).length;
  const isMatchMode = selectedMatchId != null;
  const isTemplateMode = !isMatchMode;
  const canSave = isMatchMode ? (opponent && matchDate && matchTime) : true;

  return (
    <div
      className="flex flex-col select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: isDragging ? 'none' : 'auto' }}
    >
      {/* ═══ TOP BAR ═══ */}
      <div className="space-y-2 mb-3">
        {/* Row 1: Back + context */}
        <div className="flex items-center gap-2 flex-wrap">
          {onBackToMatch && selectedMatchId ? (
            <button
              onClick={() => onBackToMatch(selectedMatchId)}
              className="text-sm text-txt-muted hover:text-accent transition-colors mr-1"
            >
              &larr; Back to Match
            </button>
          ) : (
            <button
              onClick={() => setMode('library')}
              className="text-sm text-txt-muted hover:text-accent transition-colors mr-1"
            >
              &larr; Lineup Library
            </button>
          )}

          {isMatchMode && (
            <Select
              value={selectedMatchId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) loadMatch(Number(val));
              }}
              className="flex-1 min-w-0 sm:flex-none sm:w-56"
            >
              {sortedMatches.map(m => {
                const raw = m.date as unknown;
                const dateStr = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(m.date);
                return (
                  <option key={m.id} value={m.id}>{dateStr} vs {m.opponent}</option>
                );
              })}
            </Select>
          )}

          {isTemplateMode && (
            <Input
              type="text"
              placeholder="Lineup name (e.g. 4-3-3 Pressing XI)"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="flex-1 min-w-0 sm:flex-none sm:w-64"
            />
          )}

          <Select value={formationId} onChange={e => changeFormation(e.target.value)} className="w-auto">
            {formatFormations.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-txt-faint font-mono">{assignedCount}/{slotCount}</span>
            {detectedFormation && (
              <span className="text-sm text-accent font-mono font-bold">{detectedFormation}</span>
            )}
          </div>

          {lineupDiff?.message && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium hidden sm:inline ${
              lineupDiff.newSpine ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-500/10 text-amber-400/80 border border-amber-500/20'
            }`}>{lineupDiff.message}</span>
          )}
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {isMatchMode && (
            <button
              onClick={() => setShowMatchForm(!showMatchForm)}
              className={`text-xs px-2 py-1 rounded transition-colors ${showMatchForm ? 'bg-surface-3 text-accent' : 'text-txt-faint hover:text-txt'}`}
            >
              {showMatchForm ? 'Hide Details' : 'Match Info'}
            </button>
          )}

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
            <span className="hidden sm:inline">Squad</span>
          </button>

          <button
            onClick={() => {
              const next = !showTacticalLines;
              setShowTacticalLines(next);
              if (next && defensiveLine == null) setDefensiveLine(30);
              if (next && pressingLine == null) setPressingLine(65);
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showTacticalLines ? 'bg-accent/15 text-accent border-accent/40 font-semibold' : 'text-txt-faint border-surface-5 hover:text-txt hover:border-accent/30'}`}
          >
            Tactical Lines
          </button>

          {isMatchMode && selectedMatchId && (
            <button
              onClick={saveMatchLineupAsTemplate}
              className="text-xs px-2 py-1 rounded text-txt-faint hover:text-accent transition-colors"
              title="Save this lineup as a reusable template"
            >
              Save as Template
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
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
              className="px-2 sm:px-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline sm:mr-1.5 -mt-px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              onClick={saveLineup}
              disabled={!canSave}
              className={`px-3 sm:px-4 transition-all ${saveFlash ? '!bg-emerald-500 !text-white' : ''}`}
            >
              {saveFlash ? 'Saved!' : (editingTemplateId || selectedMatchId) ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ MATCH DETAILS (collapsible) ═══ */}
      {isMatchMode && showMatchForm && (
        <div className="bg-surface-1 rounded-lg border border-surface-5 p-3 mb-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Input type="text" placeholder="Opponent" value={opponent} onChange={e => setOpponent(e.target.value)} />
            <Input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            <TimePicker value={matchTime || '16:00'} onChange={setMatchTime} />
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

      {/* Template delete option */}
      {isTemplateMode && editingTemplateId && (
        <div className="mb-3 flex justify-end">
          <button onClick={deleteTemplate} className="text-xs text-txt-faint hover:text-red-400 transition-colors">
            Delete Template
          </button>
        </div>
      )}

      {/* ═══ MAIN AREA: PITCH + DRAWER ═══ */}
      <div className="flex gap-3 relative">
        {/* PITCH (fills remaining space, capped on wide screens) */}
        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="bg-surface-1 rounded-lg border border-surface-5 p-2 sm:p-3">
            <SoccerField
              formation={formation} assignments={assignments} players={players}
              positions={resolvedPositions} labels={resolvedLabels}
              detectedFormation={detectedFormation} highlightSlotId={highlightSlotId}
              onSlotPointerDown={handleSlotPointerDown} onSlotClick={handleSlotClick}
              onSlotDoubleClick={handleSlotDoubleClick} pendingAssign={pendingAssignPlayerId != null}
              fieldRef={fieldRef} roleTags={roleTags}
              defensiveLine={showTacticalLines ? defensiveLine : undefined}
              pressingLine={showTacticalLines ? pressingLine : undefined}
              onDefensiveLineDrag={setDefensiveLine}
              onPressingLineDrag={setPressingLine}
              highlightDropPos={highlightDropPos}
            />

            {/* Role picker inline */}
            {editingRoleSlotId && assignments[editingRoleSlotId] != null && (() => {
              const slotPlayer = players.find(p => p.id === assignments[editingRoleSlotId]);
              const slotLabel = resolvedLabels[editingRoleSlotId] ?? '';
              return (
                <div className="mt-2 p-3 rounded-lg bg-surface-2 border border-surface-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-txt-muted">Role for #{slotPlayer?.jerseyNumber} {slotPlayer?.name} ({slotLabel})</span>
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
                      'bg-surface-2 border border-surface-5 hover:bg-surface-3 cursor-grab'
                    }`}
                    style={{ touchAction: 'none' }}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent text-surface-0 flex items-center justify-center text-[10px] font-bold">
                      {p.jerseyNumber}
                    </div>
                    <span className="text-txt text-xs font-medium truncate">{p.name.split(' ').pop()}</span>
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
                {isMatchMode && (
                  <>
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
                      <span className="text-txt ml-1">{matchTime ? to12Hour(matchTime) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-txt-faint">Location:</span>
                      <span className="text-txt ml-1">{location || '—'}</span>
                    </div>
                  </>
                )}
                {isTemplateMode && (
                  <div>
                    <span className="text-txt-faint">Template:</span>
                    <span className="text-txt ml-1">{templateName || 'Unnamed'}</span>
                  </div>
                )}
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

        {/* Mobile: bottom sheet with backdrop */}
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 z-30 bg-black/30"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface-1 border-t border-surface-5 rounded-t-2xl shadow-2xl max-h-[55vh] flex flex-col">
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1.5 shrink-0">
                <div className="w-10 h-1 rounded-full bg-surface-5" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2.5 border-b border-surface-5 shrink-0">
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
                <button onClick={() => setDrawerOpen(false)} className="text-txt-faint hover:text-txt text-sm p-1.5">✕</button>
              </div>

              {/* Content */}
              <div ref={drawerOpen ? rosterRef : undefined} className="overflow-y-auto flex-1 p-3 pb-safe">
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
          </>
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title={deleteTarget === 'match' ? 'Delete Match' : 'Delete Template'}
        message={deleteTarget === 'match' ? 'Delete this match? This cannot be undone.' : 'Delete this lineup template? This cannot be undone.'}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
