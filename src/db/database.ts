import Dexie, { type Table } from 'dexie';

export type GameFormat = '11v11' | '9v9' | '7v7' | '5v5';

export interface Team {
  id?: number;
  name: string;
  gameFormat: GameFormat;
  createdAt: Date;
}

export interface Player {
  id?: number;
  teamId: number;
  name: string;
  jerseyNumber: number;
  preferredPositions?: string[];
  roleTag?: string;
}

export interface LineupEntry {
  playerId: number;
  slotId: string;
  roleTag?: string;
}

export interface Match {
  id?: number;
  teamId: number;
  opponent: string;
  date: string;
  time: string;
  location?: string;
  lineup?: LineupEntry[];
  bench?: number[];
  formation?: string;
  result?: string;
  reflection?: string;
  notes?: string;
  opponentTraits?: string[];
}

export interface SessionNote {
  text: string;
  timestamp: string;
  tags?: string[];
}

export interface Practice {
  id?: number;
  teamId: number;
  date: string;
  time: string;
  duration?: number;
  focus: string;
  status: 'planned' | 'completed';
  warmup?: string;
  activity1?: string;
  activity2?: string;
  activity3?: string;
  activity4?: string;
  imageUrl?: string;
  unitTags?: string[];
  phaseTags?: string[];
  sessionNotes?: SessionNote[];
  reflection?: string;
}

export interface SeasonBlock {
  id?: number;
  teamId: number;
  label: string;
  startDate: string;
  endDate: string;
  color?: string;
  focusTheme?: string;
}

class BootroomDatabase extends Dexie {
  teams!: Table<Team>;
  players!: Table<Player>;
  matches!: Table<Match>;
  practices!: Table<Practice>;
  seasonBlocks!: Table<SeasonBlock>;

  constructor() {
    super('BootroomDB');
    this.version(1).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate'
    });
    this.version(2).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate'
    }).upgrade(tx => {
      return tx.table('teams').toCollection().modify(team => {
        if (!team.gameFormat) {
          team.gameFormat = '11v11';
        }
      });
    });
  }
}

export const db = new BootroomDatabase();
