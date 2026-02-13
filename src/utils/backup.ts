import { db } from '../db/database';
import type { Team, Player, Match, Practice, SeasonBlock } from '../db/database';

interface BackupData {
  version: 1;
  exportedAt: string;
  teams: Team[];
  players: Player[];
  matches: Match[];
  practices: Practice[];
  seasonBlocks: SeasonBlock[];
}

export async function exportBackup(): Promise<void> {
  const [teams, players, matches, practices, seasonBlocks] = await Promise.all([
    db.teams.toArray(),
    db.players.toArray(),
    db.matches.toArray(),
    db.practices.toArray(),
    db.seasonBlocks.toArray(),
  ]);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    teams,
    players,
    matches,
    practices,
    seasonBlocks,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bootroom-backup-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ success: boolean; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as BackupData;

    if (!data.version || data.version !== 1) {
      return { success: false, error: 'Invalid backup version.' };
    }
    if (
      !Array.isArray(data.teams) ||
      !Array.isArray(data.players) ||
      !Array.isArray(data.matches) ||
      !Array.isArray(data.practices) ||
      !Array.isArray(data.seasonBlocks)
    ) {
      return { success: false, error: 'Invalid backup structure.' };
    }

    await db.transaction(
      'rw',
      [db.teams, db.players, db.matches, db.practices, db.seasonBlocks],
      async () => {
        await db.teams.clear();
        await db.players.clear();
        await db.matches.clear();
        await db.practices.clear();
        await db.seasonBlocks.clear();

        await db.teams.bulkAdd(data.teams);
        await db.players.bulkAdd(data.players);
        await db.matches.bulkAdd(data.matches);
        await db.practices.bulkAdd(data.practices);
        await db.seasonBlocks.bulkAdd(data.seasonBlocks);
      },
    );

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to parse or import backup file.' };
  }
}
