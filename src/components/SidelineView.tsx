import type { Practice, SessionNote } from '../db/database';
import { computeEndTime } from '../utils/time';
import SessionNotes from './SessionNotes';

interface SidelineViewProps {
  practice: Practice;
  sessionNotes: SessionNote[];
  onSessionNotesChange: (notes: SessionNote[]) => void;
  onClose: () => void;
}

export default function SidelineView({ practice, sessionNotes, onSessionNotesChange, onClose }: SidelineViewProps) {
  const endTime = computeEndTime(practice.time, practice.duration);
  const activities = [
    practice.warmup && { label: 'Warmup', value: practice.warmup },
    practice.activity1 && { label: 'Activity 1', value: practice.activity1 },
    practice.activity2 && { label: 'Activity 2', value: practice.activity2 },
    practice.activity3 && { label: 'Activity 3', value: practice.activity3 },
    practice.activity4 && { label: 'Activity 4', value: practice.activity4 },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-[60] bg-surface-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-surface-5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-txt">{practice.focus}</h1>
          <p className="text-base sm:text-lg text-txt-muted mt-0.5">
            {practice.time} – {endTime}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-3 text-txt-muted hover:bg-surface-4 hover:text-txt transition-colors"
        >
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Tags */}
        {((practice.unitTags && practice.unitTags.length > 0) || (practice.phaseTags && practice.phaseTags.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {(practice.unitTags ?? []).map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20">
                {tag}
              </span>
            ))}
            {(practice.phaseTags ?? []).map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Activity cards — large format */}
        {activities.map(activity => (
          <div
            key={activity.label}
            className="bg-surface-1 rounded-xl border border-surface-5 p-4 sm:p-6"
          >
            <h3 className="text-xs font-semibold uppercase text-txt-faint tracking-wider mb-2">
              {activity.label}
            </h3>
            <p className="text-base sm:text-lg text-txt leading-relaxed">{activity.value}</p>
          </div>
        ))}

        {/* Practice sketch */}
        {practice.imageUrl && (
          <div className="bg-surface-1 rounded-xl border border-surface-5 p-4 sm:p-6">
            <h3 className="text-xs font-semibold uppercase text-txt-faint tracking-wider mb-3">
              Practice Sketch
            </h3>
            <img
              src={practice.imageUrl}
              alt="Practice sketch"
              className="w-full max-w-xl rounded-lg border border-surface-5"
            />
          </div>
        )}

        {/* Session notes — live capture */}
        <div className="bg-surface-1 rounded-xl border border-surface-5 p-4 sm:p-6">
          <SessionNotes
            notes={sessionNotes}
            onChange={onSessionNotesChange}
            sessionStartTime={practice.time}
          />
        </div>
      </div>
    </div>
  );
}
