import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { isToday } from '../utils/time';
import PracticeDetail from './PracticeDetail';
import Button from './ui/Button';

interface CalendarProps {
  teamId: number;
  onNavigateToDay?: (dateStr: string) => void;
  onNavigateToMatch?: () => void;
}

export default function Calendar({ teamId, onNavigateToDay, onNavigateToMatch }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);

  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId]
  );

  const practices = useLiveQuery(
    () => db.practices.where('teamId').equals(teamId).toArray(),
    [teamId]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const isCurrentMonth =
    new Date().getFullYear() === year && new Date().getMonth() === month;

  const goToToday = () => setCurrentDate(new Date());

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
        onClick={() => onNavigateToDay?.(dateStr)}
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
                onClick={(e) => { e.stopPropagation(); onNavigateToMatch?.(); }}
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
