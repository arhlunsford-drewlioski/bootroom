import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Practice } from '../db/database';
import PracticeDetail from './PracticeDetail';
import Card from './ui/Card';
import Button from './ui/Button';
import { toDateStr, computeEndTime, to12Hour } from '../utils/time';

interface DashboardProps {
  teamId: number;
  onNavigateToMatch: (matchId?: number) => void;
  onNavigateToDay: (dateStr: string) => void;
  onAddMatch: () => void;
  onAddPractice: () => void;
}

export default function Dashboard({
  teamId,
  onNavigateToMatch,
  onNavigateToDay,
  onAddMatch,
  onAddPractice,
}: DashboardProps) {
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);

  const team = useLiveQuery(() => db.teams.get(teamId), [teamId]);

  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId],
  ) ?? [];

  const practices = useLiveQuery(
    () => db.practices.where('teamId').equals(teamId).toArray(),
    [teamId],
  ) ?? [];

  const todayStr = toDateStr(new Date());

  // Next 7 days (including today)
  const upcomingDates = new Set(
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return toDateStr(d);
    }),
  );

  // Today's events
  const todayMatches = matches
    .filter(m => m.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));
  const todayPractices = practices
    .filter(p => p.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));
  const todayEvents = [
    ...todayMatches.map(m => ({ type: 'match' as const, data: m, time: m.time })),
    ...todayPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  // Upcoming events (next 7 days excluding today), sorted chronologically
  const upcomingMatches = matches
    .filter(m => upcomingDates.has(m.date) && m.date !== todayStr);
  const upcomingPractices = practices
    .filter(p => upcomingDates.has(p.date) && p.date !== todayStr);
  const upcomingEvents = [
    ...upcomingMatches.map(m => ({ type: 'match' as const, data: m, time: m.time, date: m.date })),
    ...upcomingPractices.map(p => ({ type: 'practice' as const, data: p, time: p.time, date: p.date })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Team header */}
      <h2 className="text-2xl font-bold text-txt tracking-wide font-display mb-6">
        {team?.name ?? 'My Team'}
      </h2>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Button onClick={onAddMatch}>+ Add Match</Button>
        <Button variant="secondary" onClick={onAddPractice}>+ Add Practice</Button>
      </div>

      {/* Today card */}
      <section className="mb-8">
        <h3
          onClick={() => onNavigateToDay(todayStr)}
          className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3 cursor-pointer hover:text-txt transition-colors"
        >
          Today &rarr;
        </h3>
        <Card className={todayEvents.length === 0 ? 'py-8' : ''}>
          {todayEvents.length === 0 ? (
            <p className="text-txt-faint text-sm text-center">Nothing scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(event =>
                event.type === 'match' ? (
                  <MatchRow
                    key={`m-${event.data.id}`}
                    match={event.data as Match}
                    onClick={() => onNavigateToMatch(event.data.id!)}
                  />
                ) : (
                  <PracticeRow
                    key={`p-${event.data.id}`}
                    practice={event.data as Practice}
                    onClick={() => setSelectedPracticeId(event.data.id!)}
                  />
                ),
              )}
            </div>
          )}
        </Card>
      </section>

      {/* This Week upcoming */}
      <section>
        <h3 className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3">
          This Week
        </h3>
        {upcomingEvents.length === 0 ? (
          <Card className="py-8">
            <p className="text-txt-faint text-sm text-center">No upcoming events this week.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event =>
              event.type === 'match' ? (
                <Card
                  key={`m-${event.data.id}`}
                  className="p-3 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => onNavigateToMatch((event.data as Match).id!)}
                >
                  <MatchRow
                    match={event.data as Match}
                    dayLabel={formatDayLabel(event.date)}
                  />
                </Card>
              ) : (
                <Card
                  key={`p-${event.data.id}`}
                  className="p-3 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => setSelectedPracticeId(event.data.id!)}
                >
                  <PracticeRow
                    practice={event.data as Practice}
                    dayLabel={formatDayLabel(event.date)}
                  />
                </Card>
              ),
            )}
          </div>
        )}
      </section>

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

/* ---------- Row sub-components ---------- */

function MatchRow({
  match,
  onClick,
  dayLabel,
}: {
  match: Match;
  onClick?: () => void;
  dayLabel?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Accent bar */}
      <div className="w-1 self-stretch rounded-full bg-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-accent truncate">vs {match.opponent}</span>
          {match.result && (
            <span className="text-[10px] font-medium text-emerald-400">{match.result}</span>
          )}
        </div>
        <div className="text-xs text-txt-faint mt-0.5">
          {dayLabel && <span>{dayLabel} &middot; </span>}
          {to12Hour(match.time)}
          {match.location && <span> &middot; {match.location}</span>}
        </div>
      </div>
    </div>
  );
}

function PracticeRow({
  practice,
  onClick,
  dayLabel,
}: {
  practice: Practice;
  onClick?: () => void;
  dayLabel?: string;
}) {
  const endTime = computeEndTime(practice.time, practice.duration);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Emerald bar for practice */}
      <div className="w-1 self-stretch rounded-full bg-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-txt truncate">{practice.focus}</span>
          <span
            className={`text-[10px] font-medium ${
              practice.status === 'completed' ? 'text-emerald-400' : 'text-txt-faint'
            }`}
          >
            {practice.status}
          </span>
        </div>
        <div className="text-xs text-txt-faint mt-0.5">
          {dayLabel && <span>{dayLabel} &middot; </span>}
          {to12Hour(practice.time)} – {to12Hour(endTime)}
        </div>
      </div>
    </div>
  );
}
