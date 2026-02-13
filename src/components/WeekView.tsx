import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Practice } from '../db/database';
import PracticeDetail from './PracticeDetail';
import Button from './ui/Button';
import { getSuggestedPhases } from '../utils/training-hints';
import { computeEndTime, getWeekDates, getWeekLabel, toDateStr, isToday } from '../utils/time';

interface WeekViewProps {
  teamId: number;
  onNavigateToDay: (dateStr: string) => void;
  onNavigateToMatch: (matchId?: number) => void;
}

export default function WeekView({ teamId, onNavigateToDay, onNavigateToMatch }: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);

  const referenceDate = new Date();
  referenceDate.setDate(referenceDate.getDate() + weekOffset * 7);

  const weekDates = getWeekDates(referenceDate);
  const weekLabel = getWeekLabel(referenceDate);
  const dateStrings = weekDates.map(toDateStr);
  const dateSet = new Set(dateStrings);

  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  const practices = useLiveQuery(
    () => db.practices.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  const weekMatches = matches.filter(m => dateSet.has(m.date));
  const weekPractices = practices.filter(p => dateSet.has(p.date));

  // Training hints: find opponent traits from matches this week
  const weekTraits = weekMatches.flatMap(m => m.opponentTraits ?? []);
  const suggestedPhases = weekTraits.length > 0 ? getSuggestedPhases(weekTraits) : [];

  return (
    <div>
      {/* Header nav */}
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
        </div>
        <Button variant="secondary" onClick={() => setWeekOffset(w => w + 1)} className="px-2 sm:px-3">
          <span className="hidden sm:inline">Next </span>&rarr;
        </Button>
      </div>

      {/* Training hints bar */}
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
          {dateStrings.map((dateStr, i) => {
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
                className={`min-h-32 sm:min-h-48 flex flex-col ${
                  today ? 'bg-surface-3' : 'bg-surface-2'
                }`}
              >
                {/* Day header */}
                <button
                  onClick={() => onNavigateToDay(dateStr)}
                  className="py-2.5 px-2 text-center hover:bg-surface-4/50 transition-colors"
                >
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${today ? 'text-accent' : 'text-txt-faint'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-semibold mt-0.5 ${today ? 'text-accent' : 'text-txt'}`}>
                    {date.getDate()}
                  </div>
                </button>

                {/* Events */}
                <div className="px-1.5 pb-2 flex-1 space-y-1">
                  {allEvents.map(event =>
                    event.type === 'practice' ? (
                      <PracticeCard
                        key={`p-${event.data.id}`}
                        practice={event.data as Practice}
                        onClick={() => setSelectedPracticeId(event.data.id!)}
                      />
                    ) : (
                      <MatchCard
                        key={`m-${event.data.id}`}
                        match={event.data as Match}
                        onClick={() => onNavigateToMatch((event.data as Match).id!)}
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

function PracticeCard({ practice, onClick }: { practice: Practice; onClick: () => void }) {
  const endTime = computeEndTime(practice.time, practice.duration);
  const activities = [practice.activity1, practice.activity2, practice.activity3, practice.activity4].filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="bg-surface-3 rounded p-1.5 cursor-pointer hover:bg-surface-4 transition-colors text-xs"
    >
      <div className="text-txt-faint text-[10px]">
        {practice.time} – {endTime}
      </div>
      <div className="font-medium text-txt mt-0.5">{practice.focus}</div>
      {activities.length > 0 && (
        <div className="text-txt-faint mt-0.5 line-clamp-2 text-[10px]">
          {activities.join(' \u00b7 ')}
        </div>
      )}
      {/* Unit/Phase tag chips */}
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

function MatchCard({ match, onClick }: { match: Match; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-accent/5 border border-accent/15 rounded p-1.5 cursor-pointer hover:bg-accent/10 transition-colors text-xs"
    >
      <div className="text-txt-faint text-[10px]">{match.time}</div>
      <div className="font-medium text-accent mt-0.5">vs {match.opponent}</div>
      {match.location && (
        <div className="text-txt-faint mt-0.5 truncate text-[10px]">{match.location}</div>
      )}
      {/* Opponent trait badges */}
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
      {match.result && (
        <div className="text-emerald-400 font-medium mt-0.5 text-[10px]">{match.result}</div>
      )}
    </div>
  );
}
