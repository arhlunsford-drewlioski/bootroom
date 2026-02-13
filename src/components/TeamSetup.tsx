import { useState, useEffect } from 'react';
import { db } from '../db/database';
import type { Team, Player, GameFormat } from '../db/database';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Card from './ui/Card';
import RolePicker from './ui/RolePicker';
import ConfirmDialog from './ui/ConfirmDialog';

export default function TeamSetup() {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamName, setTeamName] = useState('');
  const [gameFormat, setGameFormat] = useState<GameFormat>('11v11');
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<string | undefined>();
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null);
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    const teams = await db.teams.toArray();
    if (teams.length > 0) {
      setTeam(teams[0]);
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
    setDeletePlayerId(null);
    loadTeam();
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
    await db.teams.delete(team.id);
    setShowDeleteTeamConfirm(false);
    setTeam(null);
    setPlayers([]);
  }

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
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-txt">{team.name}</h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
          {team.gameFormat ?? '11v11'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Add Player */}
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-txt">Add Player</h3>
          <Input
            type="text"
            placeholder="Player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Jersey #"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">Role (optional)</label>
            <RolePicker value={newPlayerRole} onChange={setNewPlayerRole} />
          </div>
          <Button onClick={addPlayer} className="w-full">
            Add Player
          </Button>
        </Card>

        {/* Roster */}
        <Card>
          <h3 className="text-sm font-semibold text-txt mb-3">Roster ({players.length})</h3>
          <div className="space-y-1.5">
            {players.map(player => (
              <div key={player.id} className="px-3 py-2 bg-surface-3 rounded">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-txt-muted">#{player.jerseyNumber} {player.name}</span>
                  <div className="flex items-center gap-2">
                    {player.roleTag && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/20 text-accent border border-accent/40">
                        {player.roleTag}
                      </span>
                    )}
                    <button
                      onClick={() => deletePlayer(player.id!)}
                      className="text-txt-faint hover:text-red-400 transition-colors text-xs"
                      title="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <RolePicker
                  value={player.roleTag}
                  onChange={(role) => updatePlayerRole(player.id!, role)}
                  className="mt-1.5"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

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
        message="Remove this player from the roster?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeletePlayer}
        onCancel={() => setDeletePlayerId(null)}
      />

      <ConfirmDialog
        open={showDeleteTeamConfirm}
        title="Delete Team"
        message="Delete this team and all its data (players, matches, practices)? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteTeam}
        onCancel={() => setShowDeleteTeamConfirm(false)}
      />
    </div>
  );
}
