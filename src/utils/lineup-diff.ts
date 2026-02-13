import type { LineupEntry } from '../db/database';
import type { PositionSlot, Tier } from '../components/formations';

const SPINE_TIERS = new Set<Tier>(['GK', 'DEF', 'DMID', 'FWD']);

export interface LineupDiff {
  totalChanges: number;
  spineChanges: number;
  newSpine: boolean;
  message: string | null;
}

export function compareLineups(
  currentLineup: LineupEntry[],
  previousLineup: LineupEntry[],
  currentSlots: PositionSlot[],
  previousSlots: PositionSlot[],
): LineupDiff {
  const currentPlayerIds = new Set(currentLineup.map(e => e.playerId));
  const prevPlayerIds = new Set(previousLineup.map(e => e.playerId));

  let totalChanges = 0;
  for (const pid of currentPlayerIds) {
    if (!prevPlayerIds.has(pid)) totalChanges++;
  }

  // Spine: players in GK/DEF/DMID/FWD tier slots
  const slotMap = (slots: PositionSlot[]) => new Map(slots.map(s => [s.id, s]));
  const curSlotMap = slotMap(currentSlots);
  const prevSlotMap = slotMap(previousSlots);

  const currentSpine = new Set(
    currentLineup
      .filter(e => {
        const slot = curSlotMap.get(e.slotId);
        return slot && SPINE_TIERS.has(slot.tier);
      })
      .map(e => e.playerId),
  );
  const prevSpine = new Set(
    previousLineup
      .filter(e => {
        const slot = prevSlotMap.get(e.slotId);
        return slot && SPINE_TIERS.has(slot.tier);
      })
      .map(e => e.playerId),
  );

  let spineChanges = 0;
  for (const pid of currentSpine) {
    if (!prevSpine.has(pid)) spineChanges++;
  }

  const newSpine = spineChanges >= 3;
  let message: string | null = null;
  if (newSpine) {
    message = 'New Spine This Week';
  } else if (totalChanges >= 3) {
    message = `${totalChanges} Changes from Last Match`;
  }

  return { totalChanges, spineChanges, newSpine, message };
}
