import type { PeriodizationBlock, PeriodizationRowType } from '../db/database';

/**
 * Get the active periodization block for a specific date and row type
 */
export function getActiveBlock(
  blocks: PeriodizationBlock[],
  date: string,
  type: PeriodizationRowType
): PeriodizationBlock | undefined {
  return blocks.find(
    block => block.type === type && block.startDate <= date && block.endDate >= date
  );
}

/**
 * Get suggested intensity range based on current training phase
 */
export function getSuggestedIntensity(
  blocks: PeriodizationBlock[],
  date: string
): { min: number; max: number; message: string } {
  const trainingPhase = getActiveBlock(blocks, date, 'training');

  if (!trainingPhase) {
    return { min: 5, max: 7, message: 'No phase set - moderate intensity recommended' };
  }

  // Phase-specific recommendations
  if (trainingPhase.label.includes('General Prep')) {
    return { min: 4, max: 6, message: 'General Prep: Build base fitness with moderate intensity' };
  }
  if (trainingPhase.label.includes('Specific Prep')) {
    return { min: 6, max: 8, message: 'Specific Prep: Increase intensity, sport-specific work' };
  }
  if (trainingPhase.label.includes('Competition')) {
    return { min: 5, max: 7, message: 'Competition: Balance intensity, prioritize recovery' };
  }
  if (trainingPhase.label.includes('Recovery') || trainingPhase.label.includes('Transition')) {
    return { min: 2, max: 4, message: 'Recovery Phase: Low intensity, active recovery' };
  }
  if (trainingPhase.label.includes('Championship')) {
    return { min: 6, max: 9, message: 'Championship: Peak intensity, maximize performance' };
  }

  // Use target intensity from block if available
  if (trainingPhase.targetIntensity) {
    const target = trainingPhase.targetIntensity;
    return {
      min: Math.max(1, target - 2),
      max: Math.min(10, target + 2),
      message: `${trainingPhase.label}: Target intensity ${target}/10`
    };
  }

  return { min: 5, max: 7, message: `${trainingPhase.label}: Moderate intensity` };
}

/**
 * Check if intensity is within suggested range for current phase
 */
export function isIntensityAppropriate(
  blocks: PeriodizationBlock[],
  date: string,
  intensity: number
): { appropriate: boolean; suggestion?: string } {
  const suggested = getSuggestedIntensity(blocks, date);

  if (intensity < suggested.min) {
    return {
      appropriate: false,
      suggestion: `Low for this phase. Consider ${suggested.min}-${suggested.max}/10`
    };
  }

  if (intensity > suggested.max) {
    return {
      appropriate: false,
      suggestion: `High for this phase. Consider ${suggested.min}-${suggested.max}/10`
    };
  }

  return { appropriate: true };
}

/**
 * Get all active blocks for a given date
 */
export function getActivePhasesForDate(
  blocks: PeriodizationBlock[],
  date: string
): {
  training?: PeriodizationBlock;
  technical?: PeriodizationBlock;
  tactical?: PeriodizationBlock;
  physical?: PeriodizationBlock;
} {
  return {
    training: getActiveBlock(blocks, date, 'training'),
    technical: getActiveBlock(blocks, date, 'technical'),
    tactical: getActiveBlock(blocks, date, 'tactical'),
    physical: getActiveBlock(blocks, date, 'physical')
  };
}
