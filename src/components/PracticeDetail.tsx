import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Practice, SessionNote, SessionType } from '../db/database';
import { UNIT_TAGS, PHASE_TAGS } from '../constants/tags';
import { SESSION_TYPES } from '../constants/periodization';
import { to12Hour } from '../utils/time';
import TagPicker from './ui/TagPicker';
import Textarea from './ui/Textarea';
import Select from './ui/Select';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import SessionNotes from './SessionNotes';
import SidelineView from './SidelineView';
import PhaseContext, { usePhaseRecommendations } from './PhaseContext';

interface PracticeDetailProps {
  practiceId: number;
  onClose: () => void;
}

export default function PracticeDetail({ practiceId, onClose }: PracticeDetailProps) {
  const practice = useLiveQuery(() => db.practices.get(practiceId), [practiceId]);

  const [warmup, setWarmup] = useState('');
  const [activity1, setActivity1] = useState('');
  const [activity2, setActivity2] = useState('');
  const [activity3, setActivity3] = useState('');
  const [activity4, setActivity4] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [status, setStatus] = useState<Practice['status']>('planned');
  const [saving, setSaving] = useState(false);

  // Feature 3: Unit/Phase tags
  const [unitTags, setUnitTags] = useState<string[]>([]);
  const [phaseTags, setPhaseTags] = useState<string[]>([]);

  // Feature 7: Session notes + reflection
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [reflection, setReflection] = useState('');

  // Periodization fields
  const [intensity, setIntensity] = useState<number>(5);
  const [sessionType, setSessionType] = useState<SessionType | undefined>();
  const [duration, setDuration] = useState<number>(90);

  // Feature 6: Sideline view
  const [showSideline, setShowSideline] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get phase-aware recommendations
  const phaseRecs = usePhaseRecommendations(practice?.teamId ?? 0, practice?.date ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local state when practice loads from DB
  useEffect(() => {
    if (practice) {
      setWarmup(practice.warmup ?? '');
      setActivity1(practice.activity1 ?? '');
      setActivity2(practice.activity2 ?? '');
      setActivity3(practice.activity3 ?? '');
      setActivity4(practice.activity4 ?? '');
      setImageUrl(practice.imageUrl);
      setStatus(practice.status);
      setUnitTags(practice.unitTags ?? []);
      setPhaseTags(practice.phaseTags ?? []);
      setSessionNotes(practice.sessionNotes ?? []);
      setReflection(practice.reflection ?? '');
      setIntensity(practice.intensity ?? 5);
      setSessionType(practice.sessionType);
      setDuration(practice.duration ?? 90);
    }
  }, [practice]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    await db.practices.delete(practiceId);
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await db.practices.update(practiceId, {
        warmup: warmup || undefined,
        activity1: activity1 || undefined,
        activity2: activity2 || undefined,
        activity3: activity3 || undefined,
        activity4: activity4 || undefined,
        imageUrl,
        status,
        unitTags: unitTags.length > 0 ? unitTags : undefined,
        phaseTags: phaseTags.length > 0 ? phaseTags : undefined,
        sessionNotes: sessionNotes.length > 0 ? sessionNotes : undefined,
        reflection: reflection || undefined,
        intensity,
        sessionType,
        duration,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!practice) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-surface-2 rounded-lg p-8 text-txt-muted">Loading...</div>
      </div>
    );
  }

  const formattedDate = new Date(practice.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Feature 6: Sideline view overlay
  if (showSideline) {
    return (
      <SidelineView
        practice={practice}
        sessionNotes={sessionNotes}
        onSessionNotesChange={setSessionNotes}
        onClose={() => setShowSideline(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-surface-1 w-full sm:max-w-2xl sm:rounded-lg border border-surface-5 max-h-[95vh] flex flex-col rounded-t-2xl sm:rounded-t-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <button
            onClick={onClose}
            className="text-txt-muted hover:text-txt transition-colors text-sm"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSideline(true)}
              className="px-3 py-1 rounded-full text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Sideline View
            </button>
            <button
              onClick={() => setStatus(s => s === 'planned' ? 'completed' : 'planned')}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-colors ${
                status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-surface-4 text-txt-faint'
              }`}
            >
              {status === 'completed' ? 'Completed' : 'Planned'}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Date / Time / Focus */}
          <div>
            <h2 className="text-base font-semibold text-txt">{practice.focus}</h2>
            <p className="text-xs text-txt-faint mt-1">
              {formattedDate} &middot; {to12Hour(practice.time)}
            </p>
          </div>

          {/* Phase Context */}
          {practice && (
            <div className="bg-surface-2 rounded-lg p-3 border border-surface-5">
              <PhaseContext teamId={practice.teamId} date={practice.date} />
              {phaseRecs.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-5">
                  <div className="text-[10px] font-semibold text-txt-muted mb-1.5">Recommendations</div>
                  <ul className="space-y-1 text-[10px] text-txt-faint">
                    {phaseRecs.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-accent mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Periodization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Session Type"
              value={sessionType ?? ''}
              onChange={e => {
                const type = e.target.value as SessionType;
                setSessionType(type || undefined);
                // Auto-suggest intensity based on session type
                if (type && SESSION_TYPES[type]) {
                  setIntensity(SESSION_TYPES[type].baseIntensity);
                }
              }}
            >
              <option value="">Not specified</option>
              {(Object.keys(SESSION_TYPES) as SessionType[]).map(type => (
                <option key={type} value={type}>
                  {SESSION_TYPES[type].label}
                </option>
              ))}
            </Select>

            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 90)}
                className="h-9 w-full rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">
                Intensity {intensity}/10
                {phaseRecs.targetIntensity && (
                  <span className="ml-1 text-[10px] text-accent">
                    (target: {phaseRecs.targetIntensity})
                  </span>
                )}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={e => setIntensity(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-surface-3"
                style={{
                  accentColor: sessionType ? SESSION_TYPES[sessionType].color : '#06b6d4'
                }}
              />
              <div className="flex justify-between text-[9px] text-txt-faint mt-0.5">
                <span>Low</span>
                <span
                  className="font-semibold"
                  style={{
                    color: sessionType ? SESSION_TYPES[sessionType].color : '#06b6d4'
                  }}
                >
                  {intensity}
                </span>
                <span>Peak</span>
              </div>
            </div>
          </div>

          {/* Feature 3: Unit/Phase tags */}
          <TagPicker
            label="Unit Focus"
            options={UNIT_TAGS}
            selected={unitTags}
            onChange={setUnitTags}
            max={3}
          />

          <TagPicker
            label="Phase Focus"
            options={PHASE_TAGS}
            selected={phaseTags}
            onChange={setPhaseTags}
            max={4}
            allowCustom
          />

          {/* Activity fields */}
          <Textarea label="Warmup" value={warmup} onChange={e => setWarmup(e.target.value)} rows={2} placeholder="Describe warmup..." />
          <Textarea label="Activity 1" value={activity1} onChange={e => setActivity1(e.target.value)} rows={2} placeholder="Describe activity 1..." />
          <Textarea label="Activity 2" value={activity2} onChange={e => setActivity2(e.target.value)} rows={2} placeholder="Describe activity 2..." />
          <Textarea label="Activity 3" value={activity3} onChange={e => setActivity3(e.target.value)} rows={2} placeholder="Describe activity 3..." />
          <Textarea label="Activity 4" value={activity4} onChange={e => setActivity4(e.target.value)} rows={2} placeholder="Describe activity 4..." />

          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">
              Practice Sketch
            </label>
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Practice sketch"
                  className="w-full rounded-md border border-surface-5"
                />
                <button
                  onClick={() => { setImageUrl(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-surface-0/80 text-txt-muted hover:text-red-400 rounded px-2 py-1 text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-surface-5 rounded-lg py-8 text-txt-faint hover:border-accent hover:text-accent transition-colors text-sm"
              >
                Tap to upload sketch
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Feature 7: Session Notes */}
          <SessionNotes
            notes={sessionNotes}
            onChange={setSessionNotes}
            sessionStartTime={practice.time}
          />

          {/* Feature 7: Reflection */}
          <Textarea
            label="Post-Session Reflection"
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            rows={3}
            placeholder="What went well? What needs work?"
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-5 shrink-0 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={async () => { await handleSave(); onClose(); }}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
          <button
            onClick={handleDelete}
            className="text-xs text-txt-faint hover:text-red-400 transition-colors shrink-0"
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Practice"
        message="Delete this practice session? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
