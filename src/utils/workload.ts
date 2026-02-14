import type { Match, Practice } from '../db/database';

/**
 * Workload intensity categories based on total weekly load
 */
export type WorkloadIntensity = 'low' | 'medium' | 'high' | 'peak';

/**
 * Fixed match load value (equivalent to a high-intensity 90-minute session)
 */
const MATCH_LOAD = 100;

/**
 * Calculate workload for a single practice session
 * Formula: (intensity * duration) / 60
 *
 * @param intensity - 1-10 scale intensity rating
 * @param duration - Session duration in minutes (defaults to 90)
 * @returns Workload value
 */
export function calculatePracticeLoad(intensity: number, duration: number = 90): number {
  return (intensity * duration) / 60;
}

/**
 * Calculate total weekly workload from matches and practices
 *
 * @param matches - Array of matches in the week
 * @param practices - Array of practices in the week
 * @param weekStart - ISO date string for start of week (YYYY-MM-DD)
 * @returns Total workload value for the week
 */
export function calculateWeeklyWorkload(
  matches: Match[],
  practices: Practice[],
  weekStart: string
): number {
  // Calculate week end date (7 days from start)
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const weekStartStr = weekStart;
  const weekEndStr = endDate.toISOString().split('T')[0];

  // Filter matches in this week
  // Normalize match dates to ISO strings (handle both Date objects and strings)
  const weekMatches = matches.filter(m => {
    const matchDateStr = m.date instanceof Date
      ? m.date.toISOString().split('T')[0]
      : m.date;
    return matchDateStr >= weekStartStr && matchDateStr < weekEndStr;
  });

  // Filter practices in this week
  const weekPractices = practices.filter(p =>
    p.date >= weekStartStr && p.date < weekEndStr
  );

  // Calculate match load (fixed value per match)
  const matchLoad = weekMatches.length * MATCH_LOAD;

  // Calculate practice load (sum of all practice loads)
  const practiceLoad = weekPractices.reduce((total, practice) => {
    if (!practice.intensity) return total;
    const duration = practice.duration ?? 90; // Default to 90 minutes
    return total + calculatePracticeLoad(practice.intensity, duration);
  }, 0);

  const totalLoad = matchLoad + practiceLoad;

  // Debug first week with data
  if (totalLoad > 0 && Math.random() < 0.1) {
    console.log('Week calculation sample:', {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      matchesInWeek: weekMatches.length,
      practicesInWeek: weekPractices.length,
      matchLoad,
      practiceLoad,
      totalLoad
    });
  }

  return totalLoad;
}

/**
 * Categorize workload intensity based on total load
 *
 * Thresholds based on professional periodization standards:
 * - Low: < 300 (1-2 light sessions)
 * - Medium: 300-600 (3-4 moderate sessions or 1 match + 2 sessions)
 * - High: 600-900 (1 match + 3-4 intense sessions)
 * - Peak: > 900 (2+ matches or 1 match + heavy training load)
 *
 * @param totalLoad - Total weekly workload value
 * @returns Workload intensity category
 */
export function getWorkloadIntensity(totalLoad: number): WorkloadIntensity {
  if (totalLoad < 300) return 'low';
  if (totalLoad < 600) return 'medium';
  if (totalLoad < 900) return 'high';
  return 'peak';
}

/**
 * Get color for workload intensity visualization
 *
 * @param intensity - Workload intensity category
 * @returns Tailwind-compatible color string
 */
export function getWorkloadColor(intensity: WorkloadIntensity): string {
  switch (intensity) {
    case 'low':
      return '#10b981'; // green
    case 'medium':
      return '#f59e0b'; // amber
    case 'high':
      return '#f97316'; // orange
    case 'peak':
      return '#ef4444'; // red
  }
}

/**
 * Get display label for workload intensity
 *
 * @param intensity - Workload intensity category
 * @returns Human-readable label
 */
export function getWorkloadLabel(intensity: WorkloadIntensity): string {
  switch (intensity) {
    case 'low':
      return 'Low Load';
    case 'medium':
      return 'Medium Load';
    case 'high':
      return 'High Load';
    case 'peak':
      return 'Peak Load';
  }
}
