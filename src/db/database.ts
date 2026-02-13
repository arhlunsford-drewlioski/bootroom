import Dexie, { type Table } from 'dexie';

export type GameFormat = '11v11' | '9v9' | '7v7' | '5v5';

export interface Team {
  id?: number;
  name: string;
  gameFormat: GameFormat;
  primaryColor?: string;
  secondaryColor?: string;
  createdAt: Date;
}

export interface Player {
  id?: number;
  teamId: number;
  name: string;
  jerseyNumber: number;
  preferredPositions?: string[];
  positionTags?: string[];
  roleTag?: string;
}

export interface PlayerStats {
  id?: number;
  playerId: number;
  teamId: number;
  matchId?: number;
  date: string;
  minutesPlayed?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  attended?: boolean;
  // Goalkeeper stats (players with "Keeper" positionTag/roleTag)
  saves?: number;
  cleanSheets?: number;
  penaltiesSaved?: number;
}

export interface LineupEntry {
  playerId: number;
  slotId: string;
  roleTag?: string;
}

export interface Opponent {
  id?: number;
  teamId: number;
  name: string;
  notes?: string;
  strengths?: string;
  traits?: string[];
}

export interface Match {
  id?: number;
  teamId: number;
  opponent: string;
  opponentId?: number;
  isHome?: boolean;
  date: string;
  time: string;
  location?: string;
  lineup?: LineupEntry[];
  bench?: number[];
  formation?: string;
  result?: string;
  goalsFor?: number;
  goalsAgainst?: number;
  completed?: boolean;
  reflection?: string;
  notes?: string;
  opponentTraits?: string[];
  tacticalIntentTags?: string[];
  inGameNotes?: SessionNote[];
  keyTags?: string[];
}

export interface SessionNote {
  text: string;
  timestamp: string;
  tags?: string[];
}

export interface LineupTemplate {
  id?: number;
  teamId: number;
  name: string;
  formation: string;
  positions: LineupEntry[];
  bench?: number[];
  matchId?: number;
  createdAt: string;
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

export interface PlayerEvaluation {
  id?: number;
  playerId: number;
  teamId: number;
  date: string;
  // Technical
  techPassing?: number;
  techDribbling?: number;
  techBallManipulation?: number;
  techStriking?: number;
  techReceiving?: number;
  techTackling?: number;
  techCreativity?: number;
  // Tactical
  tacAttackingDecisions?: number;
  tacAttackingPassDribble?: number;
  tacAttackingPositioning?: number;
  tacDefendingPCB?: number;
  tacDefendingPressHoldDrop?: number;
  tacAttackingTransitions?: number;
  tacDefensiveTransitions?: number;
  // Psychological
  psyCompetitiveness?: number;
  psyFocus?: number;
  psyResilience?: number;
  psyCommunication?: number;
  psySelfDevelopment?: number;
  // Physical
  physAgility?: number;
  physQuickness?: number;
  physFitness?: number;
  physStrength?: number;
  // Notes
  notes?: string;
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
  opponents!: Table<Opponent>;
  lineupTemplates!: Table<LineupTemplate>;
  playerEvaluations!: Table<PlayerEvaluation>;
  playerStats!: Table<PlayerStats>;

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
    this.version(3).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate',
      opponents: '++id, teamId',
      lineupTemplates: '++id, teamId, matchId'
    });
    // v4: adds optional primaryColor/secondaryColor to teams (no index changes)
    this.version(4).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate',
      opponents: '++id, teamId',
      lineupTemplates: '++id, teamId, matchId'
    });
    this.version(5).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate',
      opponents: '++id, teamId',
      lineupTemplates: '++id, teamId, matchId',
      playerEvaluations: '++id, playerId, teamId, date',
      playerStats: '++id, playerId, teamId, matchId, date'
    });
  }
}

export const db = new BootroomDatabase();
