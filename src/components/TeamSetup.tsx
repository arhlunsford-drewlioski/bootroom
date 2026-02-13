import { useState, useEffect } from 'react';
import { db } from '../db/database';
import type { Team, Player, GameFormat } from '../db/database';
import { applyTeamColors } from '../utils/theme';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Card from './ui/Card';
import RolePicker from './ui/RolePicker';
import ConfirmDialog from './ui/ConfirmDialog';
import PlayerCard from './PlayerCard';

const TEAM_COLOR_PRESETS = [
  '#1a56db', '#2563eb', '#0891b2', '#059669', '#15803d',
  '#ca8a04', '#ea580c', '#dc2626', '#e11d48', '#9333ea',
  '#7c3aed', '#1e3a5f', '#0f172a', '#ffffff',
];

export default function TeamSetup() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [gameFormat, setGameFormat] = useState<GameFormat>('11v11');
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<string | undefined>();
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [secondaryColor, setSecondaryColor] = useState<string>('');
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null);
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

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
      createdAt: new Date()
    });
    setTeam({ id, name: teamName, gameFormat, createdAt: new Date() });
    setTeamName('');
  }

  async function addPlayer() {
    if (!playerName.trim() || !jerseyNumber || !team?.id) return;
    await db.players.add({
      teamId: team.id,
      name: playerName,
      jerseyNumber: parseInt(jerseyNumber),
      roleTag: newPlayerRole,
    });
    setPlayerName('');
    setJerseyNumber('');
    setNewPlayerRole(undefined);
    loadTeam();
  }

  async function updatePlayerRole(playerId: number, roleTag: string | undefined) {
    await db.players.update(playerId, { roleTag });
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

  // Sort players by jersey number
  const sortedPlayers = [...players].sort((a, b) => a.jerseyNumber - b.jerseyNumber);

  if (!team) {
    return (
      <div className="max-w-md mx-auto">
        <h2 className="text-lg font-semibold text-txt mb-4">Create Your Team</h2>
        <Card className="space-y-3">
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
          <Button onClick={createTeam} className="w-full">
            Create Team
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-txt tracking-wide font-display">ROSTER</h2>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
            {team.gameFormat ?? '11v11'}
          </span>
          <span className="text-xs text-txt-faint">{players.length} players</span>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Player'}
        </Button>
      </div>

      {/* Team Colors */}
      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-txt mb-3">Team Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1.5">Primary Color</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLOR_PRESETS.map(c => (
                <button
                  key={`p-${c}`}
                  type="button"
                  onClick={() => saveTeamColor('primaryColor', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    primaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {primaryColor && (
                <button
                  type="button"
                  onClick={() => saveTeamColor('primaryColor', undefined)}
                  className="w-7 h-7 rounded-full border border-surface-5 text-txt-faint text-xs flex items-center justify-center hover:border-txt-muted transition-colors"
                  title="Reset"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1.5">Secondary Color</label>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_COLOR_PRESETS.map(c => (
                <button
                  key={`s-${c}`}
                  type="button"
                  onClick={() => saveTeamColor('secondaryColor', c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    secondaryColor === c ? 'border-txt scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {secondaryColor && (
                <button
                  type="button"
                  onClick={() => saveTeamColor('secondaryColor', undefined)}
                  className="w-7 h-7 rounded-full border border-surface-5 text-txt-faint text-xs flex items-center justify-center hover:border-txt-muted transition-colors"
                  title="Reset"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        {(primaryColor || secondaryColor) && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-5">
            <span className="text-xs text-txt-faint">Preview:</span>
            <div className="flex items-center gap-1.5">
              {primaryColor && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: primaryColor }}>
                  Primary
                </span>
              )}
              {secondaryColor && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: secondaryColor }}>
                  Secondary
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

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
            <label className="block text-xs font-medium text-txt-muted mb-1">Role (optional)</label>
            <RolePicker value={newPlayerRole} onChange={setNewPlayerRole} />
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

      {/* Player cards */}
      <div className="space-y-2">
        {sortedPlayers.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onDelete={deletePlayer}
            onUpdateRole={updatePlayerRole}
          />
        ))}
      </div>

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
