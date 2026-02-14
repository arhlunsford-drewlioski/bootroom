import { useMemo } from 'react';
import type { Match, Practice } from '../db/database';
import type { WorkloadLevel } from '../utils/workload';
import { calculateWeeklyWorkload, getWorkloadLevel, getWorkloadColor, getWorkloadLabel, WORKLOAD_LEGEND } from '../utils/workload';

interface WorkloadChartProps {
  matches: Match[];
  practices: Practice[];
  scrollOffset: number;
  monthsToShow?: number;
}

export default function WorkloadChart({ matches, practices, scrollOffset, monthsToShow = 6 }: WorkloadChartProps) {
  if (!matches || !practices) {
    return (
      <div className="mt-6 bg-surface-2 rounded-lg p-8 border border-surface-5 flex items-center justify-center">
        <div className="text-txt-muted text-sm">Loading workload data...</div>
      </div>
    );
  }

  const weekData = useMemo(() => {
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() + scrollOffset, 1);
    const weeks: {
      startDate: string;
      endDate: string;
      workload: number;
      level: WorkloadLevel;
      label: string;
    }[] = [];

    for (let m = 0; m < monthsToShow; m++) {
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

        const workload = calculateWeeklyWorkload(matches, practices, weekStartStr);
        const level = getWorkloadLevel(workload);
        const label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        weeks.push({ startDate: weekStartStr, endDate: weekEndStr, workload, level, label });
        current.setDate(current.getDate() + 7);
      }
    }

    return weeks;
  }, [scrollOffset, matches, practices, monthsToShow]);

  const maxWorkload = Math.max(1, ...weekData.map(w => w.workload));
  const hasAnyWorkload = weekData.some(w => w.workload > 0);

  const BAR_AREA_PX = 80;
  const MIN_BAR_PX = 6;

  function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  const labelInterval = weekData.length > 20 ? 4 : weekData.length > 10 ? 2 : 1;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-txt">Weekly Workload</h3>
        <div className="flex items-center gap-3 text-[10px]">
          {WORKLOAD_LEGEND.map(entry => (
            <div key={entry.level} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-txt-faint">{entry.label}</span>
            </div>
          ))}
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
          const color = getWorkloadColor(week.level);
          const barPx = week.workload > 0
            ? Math.max(MIN_BAR_PX, (week.workload / maxWorkload) * BAR_AREA_PX)
            : 0;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end group relative h-full"
              title={`Week of ${week.label}\n${getWorkloadLabel(week.level)} (${week.level}/8)\nLoad: ${Math.round(week.workload)}`}
            >
              {week.workload > 0 && (
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${barPx}px`,
                    background: `linear-gradient(to top, ${color}, ${color}dd)`,
                  }}
                />
              )}

              {/* Tooltip on hover */}
              {week.workload > 0 && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-0 border border-surface-5 rounded px-2 py-1 text-[10px] text-txt whitespace-nowrap z-10 pointer-events-none">
                  <div className="font-semibold">{week.label}</div>
                  <div style={{ color }}>{getWorkloadLabel(week.level)} ({week.level}/8)</div>
                  <div className="text-txt-muted">{Math.round(week.workload)} load</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex mt-1 min-w-[500px]">
        {weekData.map((week, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelInterval === 0 && (
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
