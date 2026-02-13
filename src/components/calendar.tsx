import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Practice } from '../db/database';
import PracticeDetail from './PracticeDetail';
import EventFormModal from './ui/EventFormModal';
import Button from './ui/Button';
import { getSuggestedPhases } from '../utils/training-hints';
import { computeEndTime, getWeekDates, getWeekLabel, toDateStr, isToday, to12Hour } from '../utils/time';

type ViewMode = 'month' | 'week';

interface CalendarProps {
  teamId: number;
  initialMode?: ViewMode;
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

/* ── Week-mode cards (expanded detail) ── */

function WeekPracticeCard({ practice, onClick }: { practice: Practice; onClick: () => void }) {
  const endTime = computeEndTime(practice.time, practice.duration);
  const activities = [practice.activity1, practice.activity2, practice.activity3, practice.activity4].filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="bg-emerald-500/5 border border-emerald-500/15 rounded p-1.5 cursor-pointer hover:bg-emerald-500/10 transition-colors text-xs"
    >
      <div className="text-txt-faint text-[10px]">
        {to12Hour(practice.time)} – {to12Hour(endTime)}
      </div>
      <div className="font-medium text-txt mt-0.5">{practice.focus}</div>
      {activities.length > 0 && (
        <div className="text-txt-faint mt-0.5 line-clamp-2 text-[10px]">
          {activities.join(' \u00b7 ')}
        </div>
      )}
      {((practice.unitTags && practice.unitTags.length > 0) || (practice.phaseTags && practice.phaseTags.length > 0)) && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {(practice.unitTags ?? []).slice(0, 1).map(tag => (
            <span key={tag} className="px-1 py-0 rounded text-[8px] font-medium bg-accent/10 text-accent/70">
              {tag}
            </span>
          ))}
          {(practice.phaseTags ?? []).slice(0, 1).map(tag => (
            <span key={tag} className="px-1 py-0 rounded text-[8px] font-medium bg-emerald-500/10 text-emerald-400/70">
              {tag}
            </span>
          ))}
        </div>
      )}
      <span
        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
          practice.status === 'completed'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-surface-4 text-txt-faint'
        }`}
      >
        {practice.status}
      </span>
    </div>
  );
}

function WeekMatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-accent/5 border border-accent/15 rounded p-1.5 cursor-pointer hover:bg-accent/10 transition-colors text-xs"
    >
      <div className="text-txt-faint text-[10px]">{to12Hour(match.time)}</div>
      <div className="font-medium text-accent mt-0.5">vs {match.opponent}</div>
      {match.location && (
        <div className="text-txt-faint mt-0.5 truncate text-[10px]">{match.location}</div>
      )}
      {match.formation && (
        <div className="text-txt-faint mt-0.5 text-[10px]">{match.formation}</div>
      )}
      {match.opponentTraits && match.opponentTraits.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {match.opponentTraits.slice(0, 2).map(trait => (
            <span key={trait} className="px-1 py-0 rounded text-[8px] font-medium bg-amber-500/10 text-amber-400/70">
              {trait}
            </span>
          ))}
          {match.opponentTraits.length > 2 && (
            <span className="text-[8px] text-txt-faint">+{match.opponentTraits.length - 2}</span>
          )}
        </div>
      )}
      <span
        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
          match.result
            ? 'bg-emerald-500/15 text-emerald-400'
            : match.completed
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-surface-4 text-txt-faint'
        }`}
      >
        {match.result || (match.completed ? 'completed' : 'upcoming')}
      </span>
    </div>
  );
}

/* ── Main Calendar (month + week modes) ── */

export default function Calendar({ teamId, initialMode, onNavigateToDay, onNavigateToMatch }: CalendarProps) {
  const [mode, setMode] = useState<ViewMode>(initialMode ?? 'month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ dateStr: string; rect: DOMRect } | null>(null);
  const [addEventDate, setAddEventDate] = useState<string | null>(null);
  const [addEventType, setAddEventType] = useState<'match' | 'practice'>('practice');

  const matches = useLiveQuery(
    () => teamId ? db.matches.where('teamId').equals(teamId).toArray() : [],
    [teamId]
  ) ?? [];

  const practices = useLiveQuery(
    () => teamId ? db.practices.where('teamId').equals(teamId).toArray() : [],
    [teamId]
  ) ?? [];

  // ── Week-mode data ──
  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(referenceDate);
  const weekLabel = getWeekLabel(referenceDate);
  const weekDateStrings = weekDates.map(toDateStr);
  const weekDateSet = new Set(weekDateStrings);

  const weekMatches = matches.filter(m => weekDateSet.has(m.date));
  const weekPractices = practices.filter(p => weekDateSet.has(p.date));

  const weekTraits = weekMatches.flatMap(m => m.opponentTraits ?? []);
  const suggestedPhases = weekTraits.length > 0 ? getSuggestedPhases(weekTraits) : [];

  // ── Month-mode data ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() === month;

  const handleDayCellClick = (dateStr: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ dateStr, rect });
  };

  const modeToggle = (
    <div className="flex bg-surface-2 rounded-md p-0.5 border border-surface-5">
      <button
        onClick={() => setMode('month')}
        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
          mode === 'month' ? 'bg-surface-4 text-txt' : 'text-txt-faint hover:text-txt'
        }`}
      >
        Month
      </button>
      <button
        onClick={() => setMode('week')}
        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
          mode === 'week' ? 'bg-surface-4 text-txt' : 'text-txt-faint hover:text-txt'
        }`}
      >
        Week
      </button>
    </div>
  );

  return (
    <div>
      {mode === 'week' ? (
        <>
          {/* Week header */}
          <div className="flex justify-between items-center mb-4 gap-2">
            <Button variant="secondary" onClick={() => setWeekOffset(w => w - 1)} className="px-2 sm:px-3">
              &larr;<span className="hidden sm:inline"> Prev</span>
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-txt truncate">{weekLabel}</h2>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-md transition-colors shrink-0"
                >
                  Today
                </button>
              )}
              {modeToggle}
            </div>
            <Button variant="secondary" onClick={() => setWeekOffset(w => w + 1)} className="px-2 sm:px-3">
              <span className="hidden sm:inline">Next </span>&rarr;
            </Button>
          </div>

          {/* Training hints */}
          {suggestedPhases.length > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-amber-400/80 font-medium shrink-0">Training hints:</span>
              <div className="flex gap-1.5 flex-wrap">
                {suggestedPhases.map(phase => (
                  <span key={phase} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/70 border border-amber-500/15">
                    {phase}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Week grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-px bg-surface-5 rounded-lg overflow-hidden border border-surface-5 min-w-0">
              {weekDateStrings.map((dateStr, i) => {
                const date = weekDates[i];
                const today = isToday(dateStr);
                const dayMatches = weekMatches.filter(m => m.date === dateStr);
                const dayPractices = weekPractices.filter(p => p.date === dateStr);

                const allEvents = [
                  ...dayMatches.map(m => ({ type: 'match' as const, data: m, time: m.time })),
                  ...dayPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time })),
                ].sort((a, b) => a.time.localeCompare(b.time));

                return (
                  <div
                    key={dateStr}
                    className={`min-h-32 sm:min-h-48 flex flex-col cursor-pointer ${
                      today ? 'bg-surface-3' : 'bg-surface-2'
                    }`}
                    onClick={(e) => handleDayCellClick(dateStr, e)}
                  >
                    <div className="py-2.5 px-2 text-center">
                      <div className={`text-[10px] font-semibold uppercase tracking-wider ${today ? 'text-accent' : 'text-txt-faint'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-semibold mt-0.5 ${today ? 'text-accent' : 'text-txt'}`}>
                        {date.getDate()}
                      </div>
                    </div>

                    <div className="px-1.5 pb-2 flex-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                      {allEvents.map(event =>
                        event.type === 'practice' ? (
                          <WeekPracticeCard
                            key={`p-${event.data.id}`}
                            practice={event.data as Practice}
                            onClick={() => setSelectedPracticeId(event.data.id!)}
                          />
                        ) : (
                          <WeekMatchCard
                            key={`m-${event.data.id}`}
                            match={event.data as Match}
                            onClick={() => onNavigateToMatch?.((event.data as Match).id!)}
                          />
                        )
                      )}
                      {allEvents.length === 0 && (
                        <div className="text-[11px] text-txt-faint/50 text-center pt-4">No events</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Month header */}
          <div className="flex justify-between items-center mb-4 gap-2">
            <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month - 1))} className="px-2 sm:px-3">
              &larr;<span className="hidden sm:inline"> Prev</span>
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-txt">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              {!isCurrentMonth && (
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 rounded-md transition-colors"
                >
                  Today
                </button>
              )}
              {modeToggle}
            </div>
            <Button variant="secondary" onClick={() => setCurrentDate(new Date(year, month + 1))} className="px-2 sm:px-3">
              <span className="hidden sm:inline">Next </span>&rarr;
            </Button>
          </div>

          {/* Month grid */}
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="grid grid-cols-7 gap-px bg-surface-5 rounded-lg overflow-hidden border border-surface-5 min-w-[480px] sm:min-w-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div
                  key={d}
                  className="py-1.5 sm:py-2 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-surface-3 text-txt-faint"
                >
                  {d}
                </div>
              ))}
              {(() => {
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const cells = [];

                for (let i = 0; i < firstDay; i++) {
                  cells.push(
                    <div key={`empty-${i}`} className="p-1 sm:p-2 bg-surface-2 min-h-16 sm:min-h-24" />
                  );
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayMatches = matches.filter(m => m.date === dateStr);
                  const dayPractices = practices.filter(p => p.date === dateStr);
                  const today = isToday(dateStr);

                  const allEvents = [
                    ...dayMatches.map(m => ({ type: 'match' as const, data: m, time: m.time })),
                    ...dayPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time })),
                  ].sort((a, b) => a.time.localeCompare(b.time));

                  cells.push(
                    <div
                      key={day}
                      className={`p-1 sm:p-1.5 min-h-16 sm:min-h-24 cursor-pointer transition-colors ${
                        today ? 'bg-surface-3' : 'bg-surface-2 hover:bg-surface-3/50'
                      }`}
                      onClick={(e) => handleDayCellClick(dateStr, e)}
                    >
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

                return cells;
              })()}
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
        </>
      )}

      {/* Day action popover (shared) */}
      {popover && (
        <DayPopover
          dateStr={popover.dateStr}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
          onViewDay={() => onNavigateToDay?.(popover.dateStr)}
          onAddMatch={() => { setAddEventType('match'); setAddEventDate(popover.dateStr); }}
          onAddPractice={() => { setAddEventType('practice'); setAddEventDate(popover.dateStr); }}
        />
      )}

      {/* PracticeDetail modal */}
      {selectedPracticeId !== null && (
        <PracticeDetail
          practiceId={selectedPracticeId}
          onClose={() => setSelectedPracticeId(null)}
        />
      )}

      {/* Add event modal */}
      {addEventDate !== null && (
        <EventFormModal
          open={true}
          dateStr={addEventDate}
          teamId={teamId}
          initialType={addEventType}
          onClose={() => setAddEventDate(null)}
        />
      )}
    </div>
  );
}
