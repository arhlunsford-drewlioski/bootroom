import type { GameFormat } from '../db/database';

export type Tier = 'GK' | 'DEF' | 'DMID' | 'MID' | 'AMID' | 'FWD';

export interface PositionSlot {
  id: string;
  label: string;
  tier: Tier;
  x: number; // 0-100, left to right
  y: number; // 0-100, 0 = own goal (bottom), 100 = opponent goal (top)
}

export interface FormationTemplate {
  id: string;
  name: string;
  slots: PositionSlot[];
}

const TIER_ORDER: Tier[] = ['GK', 'DEF', 'DMID', 'MID', 'AMID', 'FWD'];

// ─── GK baseline shared by every formation ───
const GK: PositionSlot = { id: 'GK', label: 'GK', tier: 'GK', x: 50, y: 8 };

// ─── Common back-4 ───
const BACK4: PositionSlot[] = [
  { id: 'LB',  label: 'LB', tier: 'DEF', x: 15, y: 25 },
  { id: 'LCB', label: 'CB', tier: 'DEF', x: 38, y: 22 },
  { id: 'RCB', label: 'CB', tier: 'DEF', x: 62, y: 22 },
  { id: 'RB',  label: 'RB', tier: 'DEF', x: 85, y: 25 },
];

// ─── Common back-5 (3 CB + 2 WB) ───
const BACK5: PositionSlot[] = [
  { id: 'LWB', label: 'LWB', tier: 'DEF', x: 10, y: 28 },
  { id: 'LCB', label: 'CB',  tier: 'DEF', x: 30, y: 22 },
  { id: 'CB',  label: 'CB',  tier: 'DEF', x: 50, y: 20 },
  { id: 'RCB', label: 'CB',  tier: 'DEF', x: 70, y: 22 },
  { id: 'RWB', label: 'RWB', tier: 'DEF', x: 90, y: 28 },
];

// ─── Common back-3 ───
const BACK3: PositionSlot[] = [
  { id: 'LCB', label: 'CB', tier: 'DEF', x: 25, y: 22 },
  { id: 'CB',  label: 'CB', tier: 'DEF', x: 50, y: 20 },
  { id: 'RCB', label: 'CB', tier: 'DEF', x: 75, y: 22 },
];

// ─── Double pivot (2 CDMs) ───
const DOUBLE_PIVOT: PositionSlot[] = [
  { id: 'LCDM', label: 'CDM', tier: 'DMID', x: 38, y: 40 },
  { id: 'RCDM', label: 'CDM', tier: 'DMID', x: 62, y: 40 },
];

// ─── Single pivot (1 CDM) ───
const SINGLE_PIVOT: PositionSlot[] = [
  { id: 'CDM', label: 'CDM', tier: 'DMID', x: 50, y: 38 },
];

// ═══════════════════════════════════════════════════════
// 12 Formations
// ═══════════════════════════════════════════════════════

export const FORMATIONS: FormationTemplate[] = [
  // ── 1. 4-2-3-1 DM AM Wide ──
  // DEF=4, DMID=2, AMID=3, FWD=1  →  detected "4-2-3-1"
  {
    id: '4-2-3-1',
    name: '4-2-3-1 DM AM Wide',
    slots: [
      GK, ...BACK4, ...DOUBLE_PIVOT,
      { id: 'LW',  label: 'LW',  tier: 'AMID', x: 20, y: 62 },
      { id: 'CAM', label: 'CAM', tier: 'AMID', x: 50, y: 60 },
      { id: 'RW',  label: 'RW',  tier: 'AMID', x: 80, y: 62 },
      { id: 'ST',  label: 'ST',  tier: 'FWD',  x: 50, y: 82 },
    ],
  },

  // ── 2. 4-3-3 DM Wide ──
  // DEF=4, DMID=1, MID=2, FWD=3  →  detected "4-1-2-3"
  {
    id: '4-3-3-dm',
    name: '4-3-3 DM Wide',
    slots: [
      GK, ...BACK4, ...SINGLE_PIVOT,
      { id: 'LCM', label: 'CM', tier: 'MID', x: 30, y: 50 },
      { id: 'RCM', label: 'CM', tier: 'MID', x: 70, y: 50 },
      { id: 'LW',  label: 'LW', tier: 'FWD', x: 20, y: 75 },
      { id: 'ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
      { id: 'RW',  label: 'RW', tier: 'FWD', x: 80, y: 75 },
    ],
  },

  // ── 3. 4-3-2-1 DM AM Narrow ──
  // DEF=4, DMID=1, MID=2, AMID=2, FWD=1  →  detected "4-1-2-2-1"
  {
    id: '4-3-2-1',
    name: '4-3-2-1 DM AM Narrow',
    slots: [
      GK, ...BACK4, ...SINGLE_PIVOT,
      { id: 'LCM', label: 'CM',  tier: 'MID',  x: 30, y: 50 },
      { id: 'RCM', label: 'CM',  tier: 'MID',  x: 70, y: 50 },
      { id: 'LAM', label: 'AM',  tier: 'AMID', x: 35, y: 65 },
      { id: 'RAM', label: 'AM',  tier: 'AMID', x: 65, y: 65 },
      { id: 'ST',  label: 'ST',  tier: 'FWD',  x: 50, y: 82 },
    ],
  },

  // ── 4. 5-2-2-1 DM AM ──
  // DEF=5, DMID=2, AMID=2, FWD=1  →  detected "5-2-2-1"
  {
    id: '5-2-2-1',
    name: '5-2-2-1 DM AM',
    slots: [
      GK, ...BACK5, ...DOUBLE_PIVOT,
      { id: 'LAM', label: 'AM', tier: 'AMID', x: 35, y: 62 },
      { id: 'RAM', label: 'AM', tier: 'AMID', x: 65, y: 62 },
      { id: 'ST',  label: 'ST', tier: 'FWD',  x: 50, y: 82 },
    ],
  },

  // ── 5. 5-2-3 DM Wide ──
  // DEF=5, DMID=2, FWD=3  →  detected "5-2-3"
  {
    id: '5-2-3',
    name: '5-2-3 DM Wide',
    slots: [
      GK, ...BACK5, ...DOUBLE_PIVOT,
      { id: 'LW', label: 'LW', tier: 'FWD', x: 20, y: 75 },
      { id: 'ST', label: 'ST', tier: 'FWD', x: 50, y: 80 },
      { id: 'RW', label: 'RW', tier: 'FWD', x: 80, y: 75 },
    ],
  },

  // ── 6. 4-4-2 ──
  // DEF=4, MID=4, FWD=2  →  detected "4-4-2"
  {
    id: '4-4-2',
    name: '4-4-2',
    slots: [
      GK, ...BACK4,
      { id: 'LM',  label: 'LM', tier: 'MID', x: 15, y: 48 },
      { id: 'LCM', label: 'CM', tier: 'MID', x: 38, y: 45 },
      { id: 'RCM', label: 'CM', tier: 'MID', x: 62, y: 45 },
      { id: 'RM',  label: 'RM', tier: 'MID', x: 85, y: 48 },
      { id: 'LST', label: 'ST', tier: 'FWD', x: 38, y: 78 },
      { id: 'RST', label: 'ST', tier: 'FWD', x: 62, y: 78 },
    ],
  },

  // ── 7. 4-2-4 DM Wide ──
  // DEF=4, DMID=2, FWD=4  →  detected "4-2-4"
  {
    id: '4-2-4',
    name: '4-2-4 DM Wide',
    slots: [
      GK, ...BACK4, ...DOUBLE_PIVOT,
      { id: 'LW',  label: 'LW', tier: 'FWD', x: 15, y: 75 },
      { id: 'LCF', label: 'CF', tier: 'FWD', x: 38, y: 80 },
      { id: 'RCF', label: 'CF', tier: 'FWD', x: 62, y: 80 },
      { id: 'RW',  label: 'RW', tier: 'FWD', x: 85, y: 75 },
    ],
  },

  // ── 8. 5-2-1-2 DM AM ──
  // DEF=5, DMID=2, AMID=1, FWD=2  →  detected "5-2-1-2"
  {
    id: '5-2-1-2',
    name: '5-2-1-2 DM AM',
    slots: [
      GK, ...BACK5, ...DOUBLE_PIVOT,
      { id: 'CAM', label: 'CAM', tier: 'AMID', x: 50, y: 62 },
      { id: 'LST', label: 'ST',  tier: 'FWD',  x: 38, y: 80 },
      { id: 'RST', label: 'ST',  tier: 'FWD',  x: 62, y: 80 },
    ],
  },

  // ── 9. 4-4-2 Diamond Narrow ──
  // DEF=4, DMID=1, MID=2, AMID=1, FWD=2  →  special case "4-4-2 Diamond"
  {
    id: '4-4-2-diamond',
    name: '4-4-2 Diamond Narrow',
    slots: [
      GK, ...BACK4, ...SINGLE_PIVOT,
      { id: 'LCM', label: 'CM',  tier: 'MID',  x: 30, y: 50 },
      { id: 'RCM', label: 'CM',  tier: 'MID',  x: 70, y: 50 },
      { id: 'CAM', label: 'CAM', tier: 'AMID', x: 50, y: 62 },
      { id: 'LST', label: 'ST',  tier: 'FWD',  x: 38, y: 80 },
      { id: 'RST', label: 'ST',  tier: 'FWD',  x: 62, y: 80 },
    ],
  },

  // ── 10. 4-2-2-2 DM AM Narrow ──
  // DEF=4, DMID=2, AMID=2, FWD=2  →  detected "4-2-2-2"
  {
    id: '4-2-2-2',
    name: '4-2-2-2 DM AM Narrow',
    slots: [
      GK, ...BACK4, ...DOUBLE_PIVOT,
      { id: 'LAM', label: 'AM', tier: 'AMID', x: 35, y: 62 },
      { id: 'RAM', label: 'AM', tier: 'AMID', x: 65, y: 62 },
      { id: 'LST', label: 'ST', tier: 'FWD',  x: 38, y: 80 },
      { id: 'RST', label: 'ST', tier: 'FWD',  x: 62, y: 80 },
    ],
  },

  // ── 11. 5-3-2 DM WB ──
  // DEF=5, DMID=1, MID=2, FWD=2  →  detected "5-1-2-2"
  {
    id: '5-3-2-dm',
    name: '5-3-2 DM WB',
    slots: [
      GK, ...BACK5, ...SINGLE_PIVOT,
      { id: 'LCM', label: 'CM', tier: 'MID', x: 30, y: 50 },
      { id: 'RCM', label: 'CM', tier: 'MID', x: 70, y: 50 },
      { id: 'LST', label: 'ST', tier: 'FWD', x: 38, y: 78 },
      { id: 'RST', label: 'ST', tier: 'FWD', x: 62, y: 78 },
    ],
  },

  // ── 12. 4-3-3 AM ──
  // DEF=4, MID=2, AMID=1, FWD=3  →  detected "4-2-1-3"
  {
    id: '4-3-3-am',
    name: '4-3-3 AM',
    slots: [
      GK, ...BACK4,
      { id: 'LCM', label: 'CM',  tier: 'MID',  x: 30, y: 42 },
      { id: 'RCM', label: 'CM',  tier: 'MID',  x: 70, y: 42 },
      { id: 'CAM', label: 'CAM', tier: 'AMID', x: 50, y: 58 },
      { id: 'LW',  label: 'LW',  tier: 'FWD',  x: 20, y: 75 },
      { id: 'ST',  label: 'ST',  tier: 'FWD',  x: 50, y: 80 },
      { id: 'RW',  label: 'RW',  tier: 'FWD',  x: 80, y: 75 },
    ],
  },

  // ── 14. 3-4-3 ──
  // DEF=3, MID=4, FWD=3  →  detected "3-4-3"
  {
    id: '3-4-3',
    name: '3-4-3',
    slots: [
      GK, ...BACK3,
      { id: 'LM',  label: 'LM', tier: 'MID', x: 15, y: 48 },
      { id: 'LCM', label: 'CM', tier: 'MID', x: 38, y: 45 },
      { id: 'RCM', label: 'CM', tier: 'MID', x: 62, y: 45 },
      { id: 'RM',  label: 'RM', tier: 'MID', x: 85, y: 48 },
      { id: 'LW',  label: 'LW', tier: 'FWD', x: 20, y: 75 },
      { id: 'ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
      { id: 'RW',  label: 'RW', tier: 'FWD', x: 80, y: 75 },
    ],
  },
];

export const DEFAULT_FORMATION_ID = '4-2-3-1';

// ═══════════════════════════════════════════════════════
// 9v9 Formations (9 slots each, incl. GK)
// ═══════════════════════════════════════════════════════

const GK_9: PositionSlot = { id: '9v9-GK', label: 'GK', tier: 'GK', x: 50, y: 8 };

const FORMATIONS_9V9: FormationTemplate[] = [
  {
    id: '9v9-3-3-2',
    name: '3-3-2',
    slots: [
      GK_9,
      { id: '9v9-LCB', label: 'CB', tier: 'DEF', x: 25, y: 22 },
      { id: '9v9-CB',  label: 'CB', tier: 'DEF', x: 50, y: 20 },
      { id: '9v9-RCB', label: 'CB', tier: 'DEF', x: 75, y: 22 },
      { id: '9v9-LM',  label: 'LM', tier: 'MID', x: 20, y: 48 },
      { id: '9v9-CM',  label: 'CM', tier: 'MID', x: 50, y: 45 },
      { id: '9v9-RM',  label: 'RM', tier: 'MID', x: 80, y: 48 },
      { id: '9v9-LST', label: 'ST', tier: 'FWD', x: 38, y: 78 },
      { id: '9v9-RST', label: 'ST', tier: 'FWD', x: 62, y: 78 },
    ],
  },
  {
    id: '9v9-3-2-3',
    name: '3-2-3',
    slots: [
      GK_9,
      { id: '9v9-LCB', label: 'CB', tier: 'DEF', x: 25, y: 22 },
      { id: '9v9-CB',  label: 'CB', tier: 'DEF', x: 50, y: 20 },
      { id: '9v9-RCB', label: 'CB', tier: 'DEF', x: 75, y: 22 },
      { id: '9v9-LCM', label: 'CM', tier: 'MID', x: 35, y: 45 },
      { id: '9v9-RCM', label: 'CM', tier: 'MID', x: 65, y: 45 },
      { id: '9v9-LW',  label: 'LW', tier: 'FWD', x: 20, y: 75 },
      { id: '9v9-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
      { id: '9v9-RW',  label: 'RW', tier: 'FWD', x: 80, y: 75 },
    ],
  },
  {
    id: '9v9-2-3-3',
    name: '2-3-3',
    slots: [
      GK_9,
      { id: '9v9-LCB', label: 'CB', tier: 'DEF', x: 30, y: 22 },
      { id: '9v9-RCB', label: 'CB', tier: 'DEF', x: 70, y: 22 },
      { id: '9v9-LM',  label: 'LM', tier: 'MID', x: 20, y: 48 },
      { id: '9v9-CM',  label: 'CM', tier: 'MID', x: 50, y: 45 },
      { id: '9v9-RM',  label: 'RM', tier: 'MID', x: 80, y: 48 },
      { id: '9v9-LW',  label: 'LW', tier: 'FWD', x: 20, y: 75 },
      { id: '9v9-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
      { id: '9v9-RW',  label: 'RW', tier: 'FWD', x: 80, y: 75 },
    ],
  },
  {
    id: '9v9-2-4-2',
    name: '2-4-2',
    slots: [
      GK_9,
      { id: '9v9-LCB', label: 'CB', tier: 'DEF', x: 30, y: 22 },
      { id: '9v9-RCB', label: 'CB', tier: 'DEF', x: 70, y: 22 },
      { id: '9v9-LM',  label: 'LM', tier: 'MID', x: 15, y: 48 },
      { id: '9v9-LCM', label: 'CM', tier: 'MID', x: 38, y: 45 },
      { id: '9v9-RCM', label: 'CM', tier: 'MID', x: 62, y: 45 },
      { id: '9v9-RM',  label: 'RM', tier: 'MID', x: 85, y: 48 },
      { id: '9v9-LST', label: 'ST', tier: 'FWD', x: 38, y: 78 },
      { id: '9v9-RST', label: 'ST', tier: 'FWD', x: 62, y: 78 },
    ],
  },
  {
    id: '9v9-3-1-2-2',
    name: '3-1-2-2',
    slots: [
      GK_9,
      { id: '9v9-LCB', label: 'CB',  tier: 'DEF',  x: 25, y: 22 },
      { id: '9v9-CB',  label: 'CB',  tier: 'DEF',  x: 50, y: 20 },
      { id: '9v9-RCB', label: 'CB',  tier: 'DEF',  x: 75, y: 22 },
      { id: '9v9-CDM', label: 'CDM', tier: 'DMID', x: 50, y: 38 },
      { id: '9v9-LAM', label: 'AM',  tier: 'AMID', x: 35, y: 60 },
      { id: '9v9-RAM', label: 'AM',  tier: 'AMID', x: 65, y: 60 },
      { id: '9v9-LST', label: 'ST',  tier: 'FWD',  x: 38, y: 80 },
      { id: '9v9-RST', label: 'ST',  tier: 'FWD',  x: 62, y: 80 },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 7v7 Formations (7 slots each, incl. GK)
// ═══════════════════════════════════════════════════════

const GK_7: PositionSlot = { id: '7v7-GK', label: 'GK', tier: 'GK', x: 50, y: 8 };

const FORMATIONS_7V7: FormationTemplate[] = [
  {
    id: '7v7-2-3-1',
    name: '2-3-1',
    slots: [
      GK_7,
      { id: '7v7-LCB', label: 'CB', tier: 'DEF', x: 30, y: 22 },
      { id: '7v7-RCB', label: 'CB', tier: 'DEF', x: 70, y: 22 },
      { id: '7v7-LM',  label: 'LM', tier: 'MID', x: 20, y: 48 },
      { id: '7v7-CM',  label: 'CM', tier: 'MID', x: 50, y: 45 },
      { id: '7v7-RM',  label: 'RM', tier: 'MID', x: 80, y: 48 },
      { id: '7v7-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
    ],
  },
  {
    id: '7v7-3-2-1',
    name: '3-2-1',
    slots: [
      GK_7,
      { id: '7v7-LCB', label: 'CB', tier: 'DEF', x: 25, y: 22 },
      { id: '7v7-CB',  label: 'CB', tier: 'DEF', x: 50, y: 20 },
      { id: '7v7-RCB', label: 'CB', tier: 'DEF', x: 75, y: 22 },
      { id: '7v7-LCM', label: 'CM', tier: 'MID', x: 35, y: 50 },
      { id: '7v7-RCM', label: 'CM', tier: 'MID', x: 65, y: 50 },
      { id: '7v7-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
    ],
  },
  {
    id: '7v7-2-2-2',
    name: '2-2-2',
    slots: [
      GK_7,
      { id: '7v7-LCB', label: 'CB', tier: 'DEF', x: 30, y: 22 },
      { id: '7v7-RCB', label: 'CB', tier: 'DEF', x: 70, y: 22 },
      { id: '7v7-LCM', label: 'CM', tier: 'MID', x: 30, y: 48 },
      { id: '7v7-RCM', label: 'CM', tier: 'MID', x: 70, y: 48 },
      { id: '7v7-LST', label: 'ST', tier: 'FWD', x: 35, y: 78 },
      { id: '7v7-RST', label: 'ST', tier: 'FWD', x: 65, y: 78 },
    ],
  },
  {
    id: '7v7-1-3-2',
    name: '1-3-2',
    slots: [
      GK_7,
      { id: '7v7-CB',  label: 'CB', tier: 'DEF', x: 50, y: 20 },
      { id: '7v7-LM',  label: 'LM', tier: 'MID', x: 20, y: 48 },
      { id: '7v7-CM',  label: 'CM', tier: 'MID', x: 50, y: 45 },
      { id: '7v7-RM',  label: 'RM', tier: 'MID', x: 80, y: 48 },
      { id: '7v7-LST', label: 'ST', tier: 'FWD', x: 35, y: 78 },
      { id: '7v7-RST', label: 'ST', tier: 'FWD', x: 65, y: 78 },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// 5v5 Formations (5 slots each, incl. GK)
// ═══════════════════════════════════════════════════════

const GK_5: PositionSlot = { id: '5v5-GK', label: 'GK', tier: 'GK', x: 50, y: 8 };

const FORMATIONS_5V5: FormationTemplate[] = [
  {
    id: '5v5-2-1-1',
    name: '2-1-1',
    slots: [
      GK_5,
      { id: '5v5-LCB', label: 'CB', tier: 'DEF', x: 30, y: 25 },
      { id: '5v5-RCB', label: 'CB', tier: 'DEF', x: 70, y: 25 },
      { id: '5v5-CM',  label: 'CM', tier: 'MID', x: 50, y: 50 },
      { id: '5v5-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
    ],
  },
  {
    id: '5v5-1-2-1',
    name: '1-2-1',
    slots: [
      GK_5,
      { id: '5v5-CB',  label: 'CB', tier: 'DEF', x: 50, y: 22 },
      { id: '5v5-LCM', label: 'CM', tier: 'MID', x: 30, y: 50 },
      { id: '5v5-RCM', label: 'CM', tier: 'MID', x: 70, y: 50 },
      { id: '5v5-ST',  label: 'ST', tier: 'FWD', x: 50, y: 80 },
    ],
  },
  {
    id: '5v5-2-2',
    name: '2-2',
    slots: [
      GK_5,
      { id: '5v5-LCB', label: 'CB', tier: 'DEF', x: 30, y: 25 },
      { id: '5v5-RCB', label: 'CB', tier: 'DEF', x: 70, y: 25 },
      { id: '5v5-LST', label: 'ST', tier: 'FWD', x: 35, y: 65 },
      { id: '5v5-RST', label: 'ST', tier: 'FWD', x: 65, y: 65 },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// Format-keyed lookup + helpers
// ═══════════════════════════════════════════════════════

const BLANK: FormationTemplate = { id: 'blank', name: 'Blank', slots: [] };

export const FORMATIONS_BY_FORMAT: Record<GameFormat, FormationTemplate[]> = {
  '11v11': [BLANK, ...FORMATIONS],
  '9v9': [BLANK, ...FORMATIONS_9V9],
  '7v7': [BLANK, ...FORMATIONS_7V7],
  '5v5': [BLANK, ...FORMATIONS_5V5],
};

export const FORMAT_SLOT_COUNT: Record<GameFormat, number> = {
  '11v11': 11,
  '9v9': 9,
  '7v7': 7,
  '5v5': 5,
};

export const DEFAULT_FORMATION_FOR_FORMAT: Record<GameFormat, string> = {
  '11v11': 'blank',
  '9v9': 'blank',
  '7v7': 'blank',
  '5v5': 'blank',
};

export function getFormationsForFormat(format: GameFormat): FormationTemplate[] {
  return FORMATIONS_BY_FORMAT[format];
}

export function getDetectionThreshold(format: GameFormat): number {
  return FORMAT_SLOT_COUNT[format] - 1;
}

/** Searches all formats so old match data still resolves */
export function getFormation(id: string): FormationTemplate | undefined {
  for (const formations of Object.values(FORMATIONS_BY_FORMAT)) {
    const found = formations.find(f => f.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Derive a tier from a freeform y-coordinate (data coords: 0=own goal, 100=opponent) */
export function tierFromY(y: number): Tier {
  if (y < 15) return 'GK';
  if (y < 35) return 'DEF';
  if (y < 45) return 'DMID';
  if (y < 60) return 'MID';
  if (y < 75) return 'AMID';
  return 'FWD';
}

export function detectFormation(filledSlots: PositionSlot[]): string {
  const tierCounts: Partial<Record<Tier, number>> = {};
  for (const slot of filledSlots) {
    if (slot.tier === 'GK') continue;
    tierCounts[slot.tier] = (tierCounts[slot.tier] || 0) + 1;
  }

  // Diamond special case: 4 DEF + 1 DMID + 2 MID + 1 AMID + 2 FWD
  if (
    tierCounts['DEF'] === 4 &&
    tierCounts['DMID'] === 1 &&
    tierCounts['MID'] === 2 &&
    tierCounts['AMID'] === 1 &&
    tierCounts['FWD'] === 2
  ) {
    return '4-4-2 Diamond';
  }

  const parts: number[] = [];
  for (const tier of TIER_ORDER) {
    if (tier === 'GK') continue;
    const count = tierCounts[tier];
    if (count && count > 0) {
      parts.push(count);
    }
  }

  return parts.join('-') || '';
}
