import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../db/database';
import type { Team, Player, GameFormat } from '../db/database';
import { applyTeamColors } from '../utils/theme';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Card from './ui/Card';
import ConfirmDialog from './ui/ConfirmDialog';
import PlayerCard from './PlayerCard';

const TEAM_COLOR_PRESETS = [
  '#1a56db', '#2563eb', '#0891b2', '#059669', '#15803d',
  '#ca8a04', '#ea580c', '#dc2626', '#e11d48', '#9333ea',
  '#7c3aed', '#1e3a5f', '#0f172a', '#ffffff',
];

const POSITION_ORDER: Record<string, number> = {
  'GK': 0,
  'CB': 1, 'LB': 2, 'RB': 3, 'LWB': 4, 'RWB': 5,
  'CDM': 6, 'CM': 7, 'CAM': 8, 'LM': 9, 'RM': 10,
  'LW': 11, 'RW': 12, 'ST': 13, 'CF': 14,
};

const POSITION_OPTIONS = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
  'CDM', 'CM', 'CAM', 'LM', 'RM',
  'LW', 'RW', 'ST', 'CF',
];

type SortMode = 'number' | 'name' | 'position';

function readFileAsDataURL(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
    img.src = URL.createObjectURL(file);
  });
}

export default function TeamSetup() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [gameFormat, setGameFormat] = useState<GameFormat>('11v11');
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [secondaryColor, setSecondaryColor] = useState<string>('');
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null);
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('number');
  const [searchQuery, setSearchQuery] = useState('');
  const [createPrimaryColor, setCreatePrimaryColor] = useState<string | undefined>();
  const [createSecondaryColor, setCreateSecondaryColor] = useState<string | undefined>();
  const [newPlayerPositions, setNewPlayerPositions] = useState<string[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const createLogoInputRef = useRef<HTMLInputElement>(null);
  const [createLogo, setCreateLogo] = useState<string | undefined>();
  const colorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  // Close colors popover on click outside
  useEffect(() => {
    if (!showColors) return;
    function handleClick(e: MouseEvent) {
      if (colorsRef.current && !colorsRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColors]);

  async function loadTeam() {
    const teams = await db.teams.toArray();
    if (teams.length > 0) {
      setTeam(teams[0]);
      setPrimaryColor(teams[0].primaryColor ?? '');
      setSecondaryColor(teams[0].secondaryColor ?? '');
      const teamPlayers = await db.players.where('teamId').equals(teams[0].id!).toArray();
      setPlayers(teamPlayers);
    }
  }

  async function createTeam() {
    if (!teamName.trim()) return;
    const id = await db.teams.add({
      name: teamName,
      gameFormat,
      primaryColor: createPrimaryColor,
      secondaryColor: createSecondaryColor,
      logo: createLogo,
      createdAt: new Date()
    });
    setTeam({ id, name: teamName, gameFormat, primaryColor: createPrimaryColor, secondaryColor: createSecondaryColor, logo: createLogo, createdAt: new Date() });
    setPrimaryColor(createPrimaryColor ?? '');
    setSecondaryColor(createSecondaryColor ?? '');
    if (createPrimaryColor) applyTeamColors(createPrimaryColor, createSecondaryColor);
    setTeamName('');
  }

  async function addPlayer() {
    if (!playerName.trim() || !jerseyNumber || !team?.id) return;
    await db.players.add({
      teamId: team.id,
      name: playerName,
      jerseyNumber: parseInt(jerseyNumber),
      positionTags: newPlayerPositions.length > 0 ? newPlayerPositions : undefined,
    });
    setPlayerName('');
    setJerseyNumber('');
    setNewPlayerPositions([]);
    loadTeam();
  }

  function deletePlayer(playerId: number) {
    setDeletePlayerId(playerId);
  }

  async function confirmDeletePlayer() {
    if (deletePlayerId == null) return;
    await db.players.delete(deletePlayerId);
    // Also delete evaluations and stats for this player
    await db.playerEvaluations.where('playerId').equals(deletePlayerId).delete();
    await db.playerStats.where('playerId').equals(deletePlayerId).delete();
    setDeletePlayerId(null);
    loadTeam();
  }

  async function saveTeamColor(field: 'primaryColor' | 'secondaryColor', color: string | undefined) {
    if (!team?.id) return;
    await db.teams.update(team.id, { [field]: color });
    const updated = await db.teams.get(team.id);
    if (updated) {
      setTeam(updated);
      setPrimaryColor(updated.primaryColor ?? '');
      setSecondaryColor(updated.secondaryColor ?? '');
      applyTeamColors(updated.primaryColor, updated.secondaryColor);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!team?.id) return;
    const dataUrl = await readFileAsDataURL(file);
    await db.teams.update(team.id, { logo: dataUrl });
    setTeam(prev => prev ? { ...prev, logo: dataUrl } : prev);
  }

  async function removeLogo() {
    if (!team?.id) return;
    await db.teams.update(team.id, { logo: undefined });
    setTeam(prev => prev ? { ...prev, logo: undefined } : prev);
  }

  function deleteTeam() {
    if (!team?.id) return;
    setShowDeleteTeamConfirm(true);
  }

  async function confirmDeleteTeam() {
    if (!team?.id) return;
    await db.players.where('teamId').equals(team.id).delete();
    await db.matches.where('teamId').equals(team.id).delete();
    await db.practices.where('teamId').equals(team.id).delete();
    await db.seasonBlocks.where('teamId').equals(team.id).delete();
    await db.playerEvaluations.where('teamId').equals(team.id).delete();
    await db.playerStats.where('teamId').equals(team.id).delete();
    await db.teams.delete(team.id);
    setShowDeleteTeamConfirm(false);
    setTeam(null);
    setPlayers([]);
  }

  const filteredAndSorted = useMemo(() => {
    let list = [...players];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.jerseyNumber.toString().includes(q) ||
        (p.positionTags ?? []).some(t => t.toLowerCase().includes(q))
      );
    }
    switch (sortMode) {
      case 'number':
        return list.sort((a, b) => a.jerseyNumber - b.jerseyNumber);
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'position': {
        const posRank = (p: Player) => {
          const tags = p.positionTags ?? [];
          if (tags.length === 0) return 99;
          return Math.min(...tags.map(t => POSITION_ORDER[t] ?? 50));
        };
        return list.sort((a, b) => posRank(a) - posRank(b) || a.jerseyNumber - b.jerseyNumber);
      }
    }
  }, [players, sortMode, searchQuery]);

  if (!team) {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-txt mb-4">Create Your Team</h2>
        <Card className="space-y-4">
          <Input
            type="text"
            placeholder="Team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <Select
            label="Game Format"
            value={gameFormat}
            onChange={(e) => setGameFormat(e.target.value as GameFormat)}
          >
            <option value="11v11">11v11</option>
            <option value="9v9">9v9</option>
            <option value="7v7">7v7</option>
            <option value="5v5">5v5</option>
          </Select>
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1.5">Team Logo (optional)</label>
            <input
              ref={createLogoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const dataUrl = await readFileAsDataURL(file);
                  setCreateLogo(dataUrl);
                }
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-3">
              {createLogo ? (
                <div className="relative group">
                  <img src={createLogo} alt="Logo preview" className="w-12 h-12 rounded-xl object-cover border border-surface-5" />
                  <button
                    type="button"
                    onClick={() => setCreateLogo(undefined)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-3 border border-surface-5 text-txt-faint text-[10px] flex items-center justify-center hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => createLogoInputRef.current?.click()}
                  className="w-12 h-12 rounded-xl border border-dashed border-surface-5 flex items-center justify-center text-txt-faint hover:border-txt-muted hover:text-txt-muted transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
              )}
              <span className="text-[10px] text-txt-faint">Upload a crest or logo image</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1.5">Primary Color (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLOR_PRESETS.map(c => (
                <button
                  key={`cp-${c}`}
                  type="button"
                  onClick={() => setCreatePrimaryColor(createPrimaryColor === c ? undefined : c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    createPrimaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1.5">Secondary Color (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLOR_PRESETS.map(c => (
                <button
                  key={`cs-${c}`}
                  type="button"
                  onClick={() => setCreateSecondaryColor(createSecondaryColor === c ? undefined : c)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    createSecondaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={createTeam} className="w-full">
            Create Team
          </Button>
        </Card>
      </div>
    );
  }

  const unassignedCount = players.filter(p => !p.positionTags?.length).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleLogoUpload(file);
          e.target.value = '';
        }}
      />
      <div className="flex items-center gap-4 mb-5">
        <div className="relative group shrink-0">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center border border-surface-5 overflow-hidden cursor-pointer"
            style={{ backgroundColor: !team.logo ? (primaryColor || undefined) : undefined }}
            onClick={() => logoInputRef.current?.click()}
            title={team.logo ? 'Change logo' : 'Add team logo'}
          >
            {team.logo ? (
              <img src={team.logo} alt="Team logo" className="w-full h-full object-cover" />
            ) : (
              <span className={`text-2xl font-bold font-display tracking-wider ${primaryColor ? 'text-white' : 'text-accent'}`}>
                {team.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Hover overlay */}
          <div
            className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => logoInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          {team.logo && (
            <button
              onClick={(e) => { e.stopPropagation(); removeLogo(); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-3 border border-surface-5 text-txt-faint text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
              title="Remove logo"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-txt tracking-wide font-display truncate">
            {team.name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/15 text-accent border border-accent/25">
              {team.gameFormat ?? '11v11'}
            </span>
            <span className="text-xs text-txt-faint">
              {players.length} player{players.length !== 1 ? 's' : ''}
              {unassignedCount > 0 && <> &middot; {unassignedCount} unassigned</>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Team Colors button */}
          <div className="relative" ref={colorsRef}>
            <button
              onClick={() => setShowColors(!showColors)}
              className={`h-9 px-2.5 rounded-md border text-sm flex items-center gap-1.5 transition-colors ${
                showColors
                  ? 'bg-surface-3 border-accent/25 text-accent'
                  : 'bg-surface-2 border-surface-5 text-txt-muted hover:bg-surface-3 hover:text-txt'
              }`}
              title="Team Colors"
            >
              {/* Palette icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="2" /><circle cx="17.5" cy="10.5" r="2" /><circle cx="8.5" cy="7.5" r="2" /><circle cx="6.5" cy="12.5" r="2" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.1-.7-.4-1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9-10-9z" />
              </svg>
              {(primaryColor || secondaryColor) && (
                <div className="flex items-center gap-0.5">
                  {primaryColor && (
                    <span className="w-4 h-4 rounded-full border border-surface-5" style={{ backgroundColor: primaryColor }} />
                  )}
                  {secondaryColor && (
                    <span className="w-4 h-4 rounded-full border border-surface-5" style={{ backgroundColor: secondaryColor }} />
                  )}
                </div>
              )}
            </button>
            {showColors && (
              <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-surface-1 rounded-lg border border-surface-5 shadow-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-txt-muted mb-1.5">Primary</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_COLOR_PRESETS.map(c => (
                      <button
                        key={`p-${c}`}
                        type="button"
                        onClick={() => saveTeamColor('primaryColor', c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          primaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {primaryColor && (
                      <button
                        type="button"
                        onClick={() => saveTeamColor('primaryColor', undefined)}
                        className="w-6 h-6 rounded-full border border-surface-5 text-txt-faint text-[10px] flex items-center justify-center hover:border-txt-muted transition-colors"
                        title="Reset"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-txt-muted mb-1.5">Secondary</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_COLOR_PRESETS.map(c => (
                      <button
                        key={`s-${c}`}
                        type="button"
                        onClick={() => saveTeamColor('secondaryColor', c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          secondaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {secondaryColor && (
                      <button
                        type="button"
                        onClick={() => saveTeamColor('secondaryColor', undefined)}
                        className="w-6 h-6 rounded-full border border-surface-5 text-txt-faint text-[10px] flex items-center justify-center hover:border-txt-muted transition-colors"
                        title="Reset"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Player'}
          </Button>
        </div>
      </div>

      {/* Add Player form */}
      {showAddForm && (
        <div className="bg-surface-1 rounded-lg border border-surface-5 p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Player Name"
              placeholder="Full name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
            />
            <Input
              label="Jersey #"
              type="number"
              placeholder="Number"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">Positions (optional, max 2)</label>
            <div className="flex flex-wrap gap-1">
              {POSITION_OPTIONS.map(pos => {
                const active = newPlayerPositions.includes(pos);
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setNewPlayerPositions(newPlayerPositions.filter(t => t !== pos));
                      } else if (newPlayerPositions.length < 2) {
                        setNewPlayerPositions([...newPlayerPositions, pos]);
                      } else {
                        setNewPlayerPositions([newPlayerPositions[0], pos]);
                      }
                    }}
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
          <div className="flex justify-end pt-1">
            <Button
              onClick={addPlayer}
              disabled={!playerName.trim() || !jerseyNumber}
            >
              Add Player
            </Button>
          </div>
        </div>
      )}

      {/* Search + Sort toolbar */}
      {players.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-surface-5 bg-surface-0 pl-9 pr-3 text-xs text-txt placeholder:text-txt-faint focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-faint mr-1">Sort</span>
            {(['number', 'name', 'position'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  sortMode === mode
                    ? 'bg-accent/15 text-accent border border-accent/25'
                    : 'bg-surface-2 text-txt-muted border border-surface-5 hover:bg-surface-3'
                }`}
              >
                {mode === 'number' ? '#' : mode === 'name' ? 'Name' : 'Pos'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Player cards */}
      <div className="space-y-2">
        {filteredAndSorted.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onDelete={deletePlayer}
            onUpdate={loadTeam}
          />
        ))}
      </div>

      {/* No search results */}
      {filteredAndSorted.length === 0 && players.length > 0 && searchQuery.trim() && (
        <p className="text-center text-txt-faint text-sm py-8">No players match &ldquo;{searchQuery}&rdquo;</p>
      )}

      {/* Empty state */}
      {players.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <p className="text-txt-faint text-sm mb-4">No players yet. Add your first player.</p>
          <Button onClick={() => setShowAddForm(true)}>+ Add Player</Button>
        </div>
      )}

      {/* Delete team */}
      <div className="mt-6 pt-4 border-t border-surface-5">
        <button
          onClick={deleteTeam}
          className="text-xs text-txt-faint hover:text-red-400 transition-colors"
        >
          Delete Team
        </button>
      </div>

      <ConfirmDialog
        open={deletePlayerId !== null}
        title="Remove Player"
        message="Remove this player from the roster? Their evaluation history will also be deleted."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeletePlayer}
        onCancel={() => setDeletePlayerId(null)}
      />

      <ConfirmDialog
        open={showDeleteTeamConfirm}
        title="Delete Team"
        message="Delete this team and all its data (players, matches, practices, evaluations)? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteTeam}
        onCancel={() => setShowDeleteTeamConfirm(false)}
      />
    </div>
  );
}
