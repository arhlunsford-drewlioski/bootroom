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
const GK: PositionSlot = { id: 'GK', label: 'GK', tier: 'GK', x: 50, y: 5 };

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

  // ── 12. 3-4-3 ──
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

export function getFormation(id: string): FormationTemplate | undefined {
  return FORMATIONS.find(f => f.id === id);
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
