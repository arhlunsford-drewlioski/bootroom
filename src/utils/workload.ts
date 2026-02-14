import type { Match, Practice } from '../db/database';

/**
 * 8-level workload scale tuned for youth soccer (U7 club through high school).
 *
 * 1 Rest       – recovery week, 1 light practice
 * 2 Light      – 2 light practices
 * 3 Optimal    – 1 match OR 3 practices (sweet spot low end)
 * 4 Optimal    – 1 match + 1 practice   (sweet spot high end)
 * 5 Moderate   – 1 match + 2 practices
 * 6 Heavy      – 1 match + 3 practices
 * 7 Intense    – 2 matches + 1 practice
 * 8 Peak       – 2 matches + 3+ practices
 */
export type WorkloadLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const MATCH_LOAD = 100;

export function calculatePracticeLoad(intensity: number, duration: number = 90): number {
  return (intensity * duration) / 60;
}

export function calculateWeeklyWorkload(
  matches: Match[],
  practices: Practice[],
  weekStart: string
): number {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const weekStartStr = weekStart;
  const weekEndStr = endDate.toISOString().split('T')[0];

  const weekMatches = matches.filter(m => {
    const raw = m.date as unknown;
    const matchDateStr = raw instanceof Date
      ? raw.toISOString().split('T')[0]
      : String(m.date);
    return matchDateStr >= weekStartStr && matchDateStr < weekEndStr;
  });

  const weekPractices = practices.filter(p =>
    p.date >= weekStartStr && p.date < weekEndStr
  );

  const matchLoad = weekMatches.length * MATCH_LOAD;

  const practiceLoad = weekPractices.reduce((total, practice) => {
    if (!practice.intensity) return total;
    const duration = practice.duration ?? 90;
    return total + calculatePracticeLoad(practice.intensity, duration);
  }, 0);

  return matchLoad + practiceLoad;
}

/**
 * Map total weekly load to a 1-8 level.
 * Breakpoints ~28 load per level, anchored so that
 * level 8 ≈ 2 matches + 3 practices (≈200+ load).
 */
export function getWorkloadLevel(totalLoad: number): WorkloadLevel {
  if (totalLoad <= 0) return 1;
  if (totalLoad < 29) return 1;
  if (totalLoad < 57) return 2;
  if (totalLoad < 85) return 3;
  if (totalLoad < 114) return 4;
  if (totalLoad < 142) return 5;
  if (totalLoad < 171) return 6;
  if (totalLoad < 200) return 7;
  return 8;
}

const LEVEL_COLORS: Record<WorkloadLevel, string> = {
  1: '#3b82f6', // blue        – rest
  2: '#22a7c3', // blue-green  – light
  3: '#10b981', // green       – optimal
  4: '#22c55e', // green       – optimal
  5: '#a3c520', // yellow-green – moderate
  6: '#f59e0b', // amber       – heavy
  7: '#f97316', // orange      – intense
  8: '#ef4444', // red         – overload
};

const LEVEL_LABELS: Record<WorkloadLevel, string> = {
  1: 'Rest',
  2: 'Light',
  3: 'Optimal',
  4: 'Optimal',
  5: 'Moderate',
  6: 'Heavy',
  7: 'Intense',
  8: 'Peak',
};

export function getWorkloadColor(level: WorkloadLevel): string {
  return LEVEL_COLORS[level];
}

export function getWorkloadLabel(level: WorkloadLevel): string {
  return LEVEL_LABELS[level];
}

/** Legend entries for the chart (deduplicated labels) */
export const WORKLOAD_LEGEND: { level: WorkloadLevel; color: string; label: string }[] = [
  { level: 1, color: LEVEL_COLORS[1], label: 'Rest' },
  { level: 3, color: LEVEL_COLORS[3], label: 'Optimal' },
  { level: 5, color: LEVEL_COLORS[5], label: 'Moderate' },
  { level: 6, color: LEVEL_COLORS[6], label: 'Heavy' },
  { level: 8, color: LEVEL_COLORS[8], label: 'Peak' },
];
