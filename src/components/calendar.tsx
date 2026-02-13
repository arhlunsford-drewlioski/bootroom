import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { posthog } from '../analytics';
import { isToday } from '../utils/time';
import PracticeDetail from './PracticeDetail';
import Button from './ui/Button';

interface CalendarProps {
  teamId: number;
  onNavigateToDay?: (dateStr: string) => void;
  onNavigateToMatch?: (matchId?: number) => void;
}

/* ── tiny popover that appears on day-cell click ── */
function DayPopover({
  dateStr,
  anchorRect,
  onClose,
  onViewDay,
  onAddMatch,
  onAddPractice,
}: {
  dateStr: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onViewDay: () => void;
  onAddMatch: () => void;
  onAddPractice: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position below the click anchor, clamped to viewport
  const top = anchorRect.bottom + 4;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 170));

  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const btn = (text: string, onClick: () => void, accent?: boolean) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
        accent
          ? 'text-accent hover:bg-accent/10'
          : 'text-txt-muted hover:bg-surface-4 hover:text-txt'
      }`}
    >
      {text}
    </button>
  );

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top, left, zIndex: 60 }}
      className="w-40 bg-surface-2 border border-surface-5 rounded-lg shadow-lg py-1"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-txt-faint uppercase tracking-wider">
        {label}
      </div>
      {btn('View Day', onViewDay, true)}
      {btn('+ Add Match', onAddMatch)}
      {btn('+ Add Practice', onAddPractice)}
    </div>
  );
}

export default function Calendar({ teamId, onNavigateToDay, onNavigateToMatch }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ dateStr: string; rect: DOMRect } | null>(null);

  const matches = useLiveQuery(
    () => teamId ? db.matches.where('teamId').equals(teamId).toArray() : [],
    [teamId]
  );

  const practices = useLiveQuery(
    () => teamId ? db.practices.where('teamId').equals(teamId).toArray() : [],
    [teamId]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const isCurrentMonth =
    new Date().getFullYear() === year && new Date().getMonth() === month;

  const goToToday = () => setCurrentDate(new Date());

  // Quick-add handlers
  const quickAddMatch = (dateStr: string) => {
    const opponent = prompt('Opponent name:');
    const time = prompt('Time (e.g., 14:00):');
    if (opponent && time) {
      db.matches.add({ teamId, opponent, date: dateStr, time, location: '' })
        .then(() => posthog.capture('match_created'));
    }
  };

  const quickAddPractice = (dateStr: string) => {
    const focus = prompt('Session focus (e.g., "Possession"):');
    const time = prompt('Time (e.g., 16:00):');
    if (focus && time) {
      db.practices.add({ teamId, focus, date: dateStr, time, status: 'planned' })
        .then(() => posthog.capture('practice_created'));
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <div key={`empty-${i}`} className="p-2 bg-surface-2 min-h-24" />
    );
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayMatches = matches?.filter(m => m.date === dateStr) || [];
    const dayPractices = practices?.filter(p => p.date === dateStr) || [];
    const today = isToday(dateStr);

    // Combine and sort by time
    const allEvents = [
      ...dayMatches.map(m => ({ type: 'match' as const, data: m, time: m.time })),
      ...dayPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    cells.push(
      <div
        key={day}
        className={`p-1.5 min-h-24 cursor-pointer transition-colors ${
          today ? 'bg-surface-3' : 'bg-surface-2 hover:bg-surface-3/50'
        }`}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPopover({ dateStr, rect });
        }}
      >
        {/* Day number */}
        <div className={`text-xs font-semibold mb-1 leading-none ${
          today ? 'text-accent' : 'text-txt-faint'
        }`}>
          {today ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-surface-0 text-[10px]">
              {day}
            </span>
          ) : (
            day
          )}
        </div>

        {/* Event markers */}
        <div className="space-y-0.5">
          {allEvents.slice(0, 3).map(event =>
            event.type === 'match' ? (
              <div
                key={`m-${event.data.id}`}
                onClick={(e) => { e.stopPropagation(); onNavigateToMatch?.(event.data.id!); }}
                className="text-[10px] leading-tight px-1 py-0.5 rounded bg-accent/10 text-accent truncate cursor-pointer hover:bg-accent/20 transition-colors"
              >
                vs {event.data.opponent}
              </div>
            ) : (
              <div
                key={`p-${event.data.id}`}
                onClick={(e) => { e.stopPropagation(); setSelectedPracticeId(event.data.id!); }}
                className="text-[10px] leading-tight px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400/80 truncate cursor-pointer hover:bg-emerald-500/20 transition-colors"
              >
                {event.data.focus}
              </div>
            )
          )}
          {allEvents.length > 3 && (
            <div className="text-[9px] text-txt-faint pl-1">+{allEvents.length - 3} more</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month - 1))}>
          &larr; Prev
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-txt">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-md transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month + 1))}>
          Next &rarr;
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-px bg-surface-5 rounded-lg overflow-hidden border border-surface-5 min-w-[600px]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider bg-surface-3 text-txt-faint"
            >
              {d}
            </div>
          ))}
          {cells}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-[10px] text-txt-faint">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-accent/40" />
          Match
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/40" />
          Practice
        </div>
      </div>

      {/* Day action popover */}
      {popover && (
        <DayPopover
          dateStr={popover.dateStr}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
          onViewDay={() => onNavigateToDay?.(popover.dateStr)}
          onAddMatch={() => quickAddMatch(popover.dateStr)}
          onAddPractice={() => quickAddPractice(popover.dateStr)}
        />
      )}

      {/* PracticeDetail modal */}
      {selectedPracticeId !== null && (
        <PracticeDetail
          practiceId={selectedPracticeId}
          onClose={() => setSelectedPracticeId(null)}
        />
      )}
    </div>
  );
}
