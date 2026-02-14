import { useMemo } from 'react';
import type { Match, Practice } from '../db/database';
import { calculateWeeklyWorkload, getWorkloadIntensity, getWorkloadColor, getWorkloadLabel } from '../utils/workload';

interface WorkloadChartProps {
  matches: Match[];
  practices: Practice[];
  scrollOffset: number; // To stay in sync with SeasonOverview timeline
}

export default function WorkloadChart({ matches, practices, scrollOffset }: WorkloadChartProps) {
  // CRITICAL DEBUG: Check what props are actually received
  console.log('🔍 WorkloadChart Props Received:', {
    matchesReceived: matches?.length ?? 'undefined',
    practicesReceived: practices?.length ?? 'undefined',
    matchSample: matches?.[0],
    practiceSample: practices?.[0],
    scrollOffset
  });

  // Show loading state if data isn't ready
  if (!matches || !practices) {
    return (
      <div className="mt-6 bg-surface-2 rounded-lg p-8 border border-surface-5 flex items-center justify-center">
        <div className="text-txt-muted text-sm">Loading workload data...</div>
      </div>
    );
  }

  // Generate same 6-month week structure as SeasonOverview
  const weekData = useMemo(() => {
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() + scrollOffset, 1);
    const weeks: {
      startDate: string;
      endDate: string;
      workload: number;
      intensity: 'low' | 'medium' | 'high' | 'peak';
      label: string;
    }[] = [];

    // Generate 6 months of weeks
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);

      const firstDay = new Date(monthDate);
      const dayOfWeek = firstDay.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(firstDay);
      weekStart.setDate(weekStart.getDate() + mondayOffset);

      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const current = new Date(weekStart);

      while (current < nextMonth) {
        const weekStartStr = toDateStr(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = toDateStr(weekEnd);

        // Calculate workload for this week
        const workload = calculateWeeklyWorkload(matches, practices, weekStartStr);
        const intensity = getWorkloadIntensity(workload);

        // Create readable label (e.g., "Jan 1")
        const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weeks.push({
          startDate: weekStartStr,
          endDate: weekEndStr,
          workload,
          intensity,
          label
        });

        current.setDate(current.getDate() + 7);
      }
    }

    return weeks;
  }, [scrollOffset, matches, practices]);

  const maxWorkload = Math.max(1, ...weekData.map(w => w.workload));
  const hasAnyWorkload = weekData.some(w => w.workload > 0);

  // Debug logging
  const weeksWithLoad = weekData.filter(w => w.workload > 0);
  console.log('WorkloadChart Debug:', {
    totalWeeks: weekData.length,
    weeksWithLoad: weeksWithLoad.length,
    maxWorkload,
    hasAnyWorkload,
    sampleWeek: weeksWithLoad[0],
    totalMatches: matches.length,
    totalPractices: practices.length,
    practicesWithIntensity: practices.filter(p => p.intensity).length,
    firstWeek: weekData[0],
    lastWeek: weekData[weekData.length - 1]
  });

  function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-txt">Weekly Workload</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span className="text-txt-faint">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-txt-faint">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span className="text-txt-faint">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-txt-faint">Peak</span>
          </div>
        </div>
      </div>

      {/* Workload bars */}
      <div className="flex items-end gap-px h-24 bg-surface-2 rounded-lg p-2 min-w-[500px] overflow-x-auto relative">
        {!hasAnyWorkload && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="text-txt-faint text-sm">No workload data yet</div>
              <div className="text-txt-faint text-xs mt-1">
                Add practices with intensity values or schedule matches
              </div>
            </div>
          </div>
        )}
        {weekData.map((week, i) => {
          const heightPercent = maxWorkload > 0 ? (week.workload / maxWorkload) * 100 : 0;
          const color = getWorkloadColor(week.intensity);

          // Ensure minimum visible height for bars with load
          // Temporarily force 50% height for ANY bar to test visibility
          const displayHeight = week.workload > 0 ? Math.max(50, heightPercent) : 0;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative"
              title={`Week of ${week.label}\n${getWorkloadLabel(week.intensity)}\nLoad: ${Math.round(week.workload)}`}
            >
              {/* Bar */}
              {week.workload > 0 && (
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${displayHeight}%`,
                    backgroundColor: color,
                    background: `linear-gradient(to top, ${color}, ${color}dd)`
                  }}
                />
              )}

              {/* Tooltip on hover */}
              {week.workload > 0 && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-0 border border-surface-5 rounded px-2 py-1 text-[10px] text-txt whitespace-nowrap z-10 pointer-events-none">
                  <div className="font-semibold">{week.label}</div>
                  <div className="text-txt-muted">{getWorkloadLabel(week.intensity)}</div>
                  <div className="text-accent">{Math.round(week.workload)} load</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week labels (show every 4th week to avoid crowding) */}
      <div className="flex mt-1 min-w-[500px]">
        {weekData.map((week, i) => (
          <div
            key={i}
            className="flex-1 text-center"
          >
            {i % 4 === 0 && (
              <span className="text-[9px] text-txt-faint">{week.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-3 flex gap-4 text-xs">
        <div className="px-3 py-1.5 bg-surface-2 rounded border border-surface-5">
          <span className="text-txt-muted">Avg Weekly Load:</span>
          <span className="ml-2 font-semibold text-txt">
            {weekData.length > 0
              ? Math.round(weekData.reduce((sum, w) => sum + w.workload, 0) / weekData.length)
              : 0}
          </span>
        </div>
        <div className="px-3 py-1.5 bg-surface-2 rounded border border-surface-5">
          <span className="text-txt-muted">Peak Week:</span>
          <span className="ml-2 font-semibold text-txt">
            {maxWorkload > 0 ? Math.round(maxWorkload) : 0}
          </span>
        </div>
        <div className="px-3 py-1.5 bg-surface-2 rounded border border-surface-5">
          <span className="text-txt-muted">Total Weeks:</span>
          <span className="ml-2 font-semibold text-txt">{weekData.length}</span>
        </div>
      </div>
    </div>
  );
}
