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

export type SessionType = 'technical' | 'tactical' | 'physical' | 'fitness' | 'recovery';

export type ActivityCategory = 'warmup' | 'technical' | 'tactical' | 'physical'
  | 'fitness' | 'recovery' | 'game-form' | 'set-pieces';

export interface Activity {
  id?: number;
  name: string;
  category: ActivityCategory;
  suggestedDuration: number; // minutes
  intensity: number; // 1-10
  description: string;
  isBuiltIn: boolean;
  packId?: string;
  isPremium?: boolean;
}

export interface SessionTemplateActivity {
  activityId: number;
  slot: 'warmup' | 'activity1' | 'activity2' | 'activity3' | 'activity4';
}

export interface SessionTemplate {
  id?: number;
  name: string;
  sessionType: SessionType;
  focus: string;
  duration: number;
  intensity: number;
  activities: SessionTemplateActivity[];
  unitTags?: string[];
  phaseTags?: string[];
  description?: string;
  isBuiltIn: boolean;
  packId?: string;
  isPremium?: boolean;
}

export interface ActivityRef {
  activityId: number;
  activityName: string;
}

export interface Practice {
  id?: number;
  teamId: number;
  date: string;
  time: string;
  duration?: number; // minutes
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
  // Periodization enhancements
  intensity?: number; // 1-10 scale for workload tracking
  sessionType?: SessionType; // categorization for periodization
  // Activity library references
  warmupRef?: ActivityRef;
  activity1Ref?: ActivityRef;
  activity2Ref?: ActivityRef;
  activity3Ref?: ActivityRef;
  activity4Ref?: ActivityRef;
  templateId?: number;
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

export type PeriodizationRowType = 'training' | 'technical' | 'tactical' | 'physical';

export interface PeriodizationBlock {
  id?: number;
  teamId: number;
  type: PeriodizationRowType; // Which row this block belongs to
  label: string;
  startDate: string;
  endDate: string;
  color?: string;
  focusTheme?: string; // Specific training focus for this period
  targetIntensity?: number; // 1-10 scale, suggested intensity for this period
}

class BootroomDatabase extends Dexie {
  teams!: Table<Team>;
  players!: Table<Player>;
  matches!: Table<Match>;
  practices!: Table<Practice>;
  seasonBlocks!: Table<SeasonBlock>;
  periodizationBlocks!: Table<PeriodizationBlock>;
  opponents!: Table<Opponent>;
  lineupTemplates!: Table<LineupTemplate>;
  playerEvaluations!: Table<PlayerEvaluation>;
  playerStats!: Table<PlayerStats>;
  activities!: Table<Activity>;
  sessionTemplates!: Table<SessionTemplate>;

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
    // v6: adds periodizationBlocks table and intensity/sessionType to practices
    this.version(6).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate',
      periodizationBlocks: '++id, teamId, type, startDate',
      opponents: '++id, teamId',
      lineupTemplates: '++id, teamId, matchId',
      playerEvaluations: '++id, playerId, teamId, date',
      playerStats: '++id, playerId, teamId, matchId, date'
    });
    // v7: adds activities and sessionTemplates tables
    this.version(7).stores({
      teams: '++id, name',
      players: '++id, teamId, jerseyNumber',
      matches: '++id, teamId, date',
      practices: '++id, teamId, date',
      seasonBlocks: '++id, teamId, startDate',
      periodizationBlocks: '++id, teamId, type, startDate',
      opponents: '++id, teamId',
      lineupTemplates: '++id, teamId, matchId',
      playerEvaluations: '++id, playerId, teamId, date',
      playerStats: '++id, playerId, teamId, matchId, date',
      activities: '++id, category, isBuiltIn',
      sessionTemplates: '++id, sessionType, isBuiltIn',
    });
  }
}

export const db = new BootroomDatabase();

// Expose db globally for debugging in development
if (import.meta.env.DEV) {
  (window as any).db = db;
  console.log('✅ Database exposed to window.db for debugging');
}
