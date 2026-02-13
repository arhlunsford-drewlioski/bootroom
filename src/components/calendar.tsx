import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import PracticeDetail from './PracticeDetail';
import Button from './ui/Button';

interface CalendarProps {
  teamId: number;
  onNavigateToDay?: (dateStr: string) => void;
}

export default function Calendar({ teamId, onNavigateToDay }: CalendarProps) {
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

  const handleDayClick = (dateStr: string) => {
    const choice = prompt('Add:\n1 - Game\n2 - Practice\n\nEnter 1 or 2:');

    if (choice === '1') {
      const opponent = prompt('Opponent name:');
      const time = prompt('Time (e.g., 14:00):');
      if (opponent && time) {
        db.matches.add({
          teamId,
          opponent,
          date: dateStr,
          time,
          location: '',
        });
      }
    } else if (choice === '2') {
      const focus = prompt('Session focus (e.g., "Possession"):');
      const time = prompt('Time (e.g., 16:00):');
      if (focus && time) {
        db.practices.add({
          teamId,
          focus,
          date: dateStr,
          time,
          status: 'planned',
        });
      }
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <div key={`empty-${i}`} className="p-2.5 bg-surface-2" />
    );
  }

  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayMatches = matches?.filter(m => m.date === dateStr) || [];
    const dayPractices = practices?.filter(p => p.date === dateStr) || [];

    // Combine and sort by time
    const allEvents = [
      ...dayMatches.map(m => ({ type: 'match' as const, data: m, time: m.time })),
      ...dayPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    cells.push(
      <div
        key={day}
        onClick={() => handleDayClick(dateStr)}
        className="p-2 min-h-28 bg-surface-2 hover:bg-surface-3 cursor-pointer transition-colors"
      >
        <div
          onClick={(e) => { e.stopPropagation(); onNavigateToDay?.(dateStr); }}
          className="text-xs text-txt-faint mb-1.5 font-medium hover:text-accent cursor-pointer inline-block"
        >{day}</div>
            {allEvents.map((event) =>
             event.type === 'match' ? (
                 <div
                      key={`m-${event.data.id}`}
                      className="text-[11px] bg-accent/5 text-accent px-1.5 py-0.5 mb-1 rounded border border-accent/15"
                     >
                      {event.time} - vs {event.data.opponent}
                 </div>
                ) : (
                 <div
                      key={`p-${event.data.id}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedPracticeId(event.data.id!); }}
                      className="text-[11px] bg-surface-3 text-txt-muted px-1.5 py-0.5 mb-1 rounded hover:bg-surface-4 cursor-pointer transition-colors"
                 >
                   {event.time} - {event.data.focus}
                </div>
             )
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month - 1))}>
          &larr; Prev
        </Button>
        <h2 className="text-lg font-semibold text-txt">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month + 1))}>
          Next &rarr;
        </Button>
      </div>

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

      {selectedPracticeId !== null && (
        <PracticeDetail
          practiceId={selectedPracticeId}
          onClose={() => setSelectedPracticeId(null)}
        />
      )}
    </div>
  );
}
