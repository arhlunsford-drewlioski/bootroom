import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Match, Practice } from '../db/database';
import PracticeDetail from './PracticeDetail';
import Button from './ui/Button';
import Card from './ui/Card';
import { computeEndTime, shiftDate } from '../utils/time';

interface DayViewProps {
  teamId: number;
  dateStr: string;
  onBack: () => void;
  onNavigateToMatch: () => void;
  onDateChange: (dateStr: string) => void;
}

export default function DayView({ teamId, dateStr, onBack, onNavigateToMatch, onDateChange }: DayViewProps) {
  const [selectedPracticeId, setSelectedPracticeId] = useState<number | null>(null);

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  const practices = useLiveQuery(
    () => db.practices.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  const dayMatches = matches.filter(m => m.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const dayPractices = practices.filter(p => p.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-sm text-txt-muted hover:text-txt transition-colors"
        >
          &larr; Back to Week
        </button>
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={() => onDateChange(shiftDate(dateStr, -1))}>
            &larr;
          </Button>
          <Button variant="secondary" onClick={() => onDateChange(shiftDate(dateStr, 1))}>
            &rarr;
          </Button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-txt mb-4">{formattedDate}</h2>

      {/* Practices */}
      {dayPractices.length > 0 && (
        <section className="mb-6">
          <h3 className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3">Practices</h3>
          <div className="space-y-3">
            {dayPractices.map(practice => (
              <DayPracticeCard
                key={practice.id}
                practice={practice}
                onEdit={() => setSelectedPracticeId(practice.id!)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Matches */}
      {dayMatches.length > 0 && (
        <section className="mb-6">
          <h3 className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-3">Matches</h3>
          <div className="space-y-3">
            {dayMatches.map(match => (
              <DayMatchCard
                key={match.id}
                match={match}
                onViewLineup={onNavigateToMatch}
              />
            ))}
          </div>
        </section>
      )}

      {dayPractices.length === 0 && dayMatches.length === 0 && (
        <div className="text-txt-faint text-center py-16 text-sm">No events scheduled for this day.</div>
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

function DayPracticeCard({ practice, onEdit }: { practice: Practice; onEdit: () => void }) {
  const endTime = computeEndTime(practice.time, practice.duration);
  const activities = [
    practice.warmup && { label: 'Warmup', value: practice.warmup },
    practice.activity1 && { label: 'Activity 1', value: practice.activity1 },
    practice.activity2 && { label: 'Activity 2', value: practice.activity2 },
    practice.activity3 && { label: 'Activity 3', value: practice.activity3 },
    practice.activity4 && { label: 'Activity 4', value: practice.activity4 },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-txt-faint">{practice.time} – {endTime}</div>
          <div className="text-sm font-semibold text-txt mt-1">{practice.focus}</div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            practice.status === 'completed'
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-surface-4 text-txt-faint'
          }`}
        >
          {practice.status}
        </span>
      </div>

      {/* Unit/Phase tags */}
      {((practice.unitTags && practice.unitTags.length > 0) || (practice.phaseTags && practice.phaseTags.length > 0)) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(practice.unitTags ?? []).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
              {tag}
            </span>
          ))}
          {(practice.phaseTags ?? []).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {tag}
            </span>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-3 space-y-1">
          {activities.map(a => (
            <div key={a.label} className="flex flex-col sm:flex-row text-sm">
              <span className="text-txt-faint sm:w-24 shrink-0">{a.label}</span>
              <span className="text-txt-muted">{a.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Session notes count */}
      {practice.sessionNotes && practice.sessionNotes.length > 0 && (
        <div className="mt-2 text-[10px] text-txt-faint">
          {practice.sessionNotes.length} session note{practice.sessionNotes.length !== 1 ? 's' : ''}
        </div>
      )}

      <button
        onClick={onEdit}
        className="mt-3 text-xs text-accent hover:text-accent-dark transition-colors"
      >
        Edit Session &rarr;
      </button>
    </Card>
  );
}

function DayMatchCard({ match, onViewLineup }: { match: Match; onViewLineup: () => void }) {
  return (
    <div className="rounded-lg border border-accent/20 bg-surface-1 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-txt-faint">{match.time}</div>
          <div className="text-sm font-semibold text-accent mt-1">vs {match.opponent}</div>
        </div>
        {match.result && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
            {match.result}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm">
        {match.location && (
          <div className="flex flex-col sm:flex-row">
            <span className="text-txt-faint sm:w-24 shrink-0">Location</span>
            <span className="text-txt-muted">{match.location}</span>
          </div>
        )}
        {match.formation && (
          <div className="flex flex-col sm:flex-row">
            <span className="text-txt-faint sm:w-24 shrink-0">Formation</span>
            <span className="text-txt-muted">{match.formation}</span>
          </div>
        )}
      </div>

      {/* Opponent scouting traits */}
      {match.opponentTraits && match.opponentTraits.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase text-txt-faint tracking-wider mb-1.5">Scouting</div>
          <div className="flex flex-wrap gap-1.5">
            {match.opponentTraits.map(trait => (
              <span key={trait} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onViewLineup}
        className="mt-3 text-xs text-accent hover:text-accent-dark transition-colors"
      >
        View Lineup &rarr;
      </button>
    </div>
  );
}
