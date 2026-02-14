import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { SessionTemplate, Practice } from '../../db/database';
import { SESSION_TYPES } from '../../constants/periodization';
import { resolveTemplateToFields } from '../../utils/template-resolve';
import { posthog } from '../../analytics';
import Button from './Button';
import Input from './Input';
import TimePicker from './TimePicker';

interface EventFormModalProps {
  open: boolean;
  dateStr: string;
  teamId: number;
  initialType?: 'match' | 'practice';
  onClose: () => void;
  onCreated?: (type: 'match' | 'practice', id: number) => void;
}

export default function EventFormModal({
  open,
  dateStr,
  teamId,
  initialType = 'practice',
  onClose,
  onCreated,
}: EventFormModalProps) {
  const [eventType, setEventType] = useState<'match' | 'practice'>(initialType);
  const [opponent, setOpponent] = useState('');
  const [focus, setFocus] = useState('');
  const [time, setTime] = useState('16:00');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Template picker state
  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [templateFields, setTemplateFields] = useState<Partial<Practice> | null>(null);

  const templates = useLiveQuery(
    () => open && eventType === 'practice' ? db.sessionTemplates.toArray() : Promise.resolve([] as SessionTemplate[]),
    [open, eventType],
  ) ?? [];

  // Reset form when modal opens or type changes
  useEffect(() => {
    if (open) {
      setEventType(initialType);
      setOpponent('');
      setFocus('');
      setTime('16:00');
      setLocation('');
      setStep(initialType === 'practice' ? 'pick' : 'form');
      setSelectedTemplate(null);
      setTemplateFields(null);
    }
  }, [open, initialType]);

  // When switching to match, go straight to form
  useEffect(() => {
    if (eventType === 'match') {
      setStep('form');
      setSelectedTemplate(null);
      setTemplateFields(null);
    } else if (step === 'form' && !selectedTemplate) {
      // Switching back to practice while on blank form — stay on form
    }
  }, [eventType, step, selectedTemplate]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const canCreate = eventType === 'match'
    ? opponent.trim().length > 0 && time.length > 0
    : focus.trim().length > 0 && time.length > 0;

  const handlePickTemplate = async (template: SessionTemplate) => {
    const fields = await resolveTemplateToFields(template);
    setSelectedTemplate(template);
    setTemplateFields(fields);
    setFocus(fields.focus ?? '');
    setStep('form');
  };

  const handlePickBlank = () => {
    setSelectedTemplate(null);
    setTemplateFields(null);
    setFocus('');
    setStep('form');
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      if (eventType === 'match') {
        const id = await db.matches.add({
          teamId,
          opponent: opponent.trim(),
          date: dateStr,
          time,
          location: location.trim() || undefined,
        });
        posthog.capture('match_created');
        onCreated?.('match', id as number);
      } else {
        const practiceData: Practice = {
          teamId,
          focus: focus.trim(),
          date: dateStr,
          time,
          status: 'planned' as const,
          intensity: 5,
          duration: 90,
          ...(templateFields ? {
            sessionType: templateFields.sessionType,
            intensity: templateFields.intensity,
            duration: templateFields.duration,
            warmup: templateFields.warmup,
            activity1: templateFields.activity1,
            activity2: templateFields.activity2,
            activity3: templateFields.activity3,
            activity4: templateFields.activity4,
            warmupRef: templateFields.warmupRef,
            activity1Ref: templateFields.activity1Ref,
            activity2Ref: templateFields.activity2Ref,
            activity3Ref: templateFields.activity3Ref,
            activity4Ref: templateFields.activity4Ref,
            unitTags: templateFields.unitTags,
            phaseTags: templateFields.phaseTags,
            templateId: templateFields.templateId,
          } : {}),
        };
        const id = await db.practices.add(practiceData);
        posthog.capture('practice_created');
        onCreated?.('practice', id as number);
      }
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 w-full sm:max-w-md sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-txt">
              {step === 'pick' ? 'Choose a Template' : 'Add Event'}
            </h3>
            <p className="text-xs text-txt-faint mt-0.5">{formattedDate}</p>
          </div>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Step 1: Template Picker (practice only) */}
          {eventType === 'practice' && step === 'pick' && (
            <>
              {/* Blank session option */}
              <button
                onClick={handlePickBlank}
                className="w-full text-left px-3 py-3 rounded-lg border border-dashed border-surface-5 hover:border-accent/40 transition-colors"
              >
                <p className="text-sm font-medium text-txt">Blank Session</p>
                <p className="text-xs text-txt-faint mt-0.5">Start from scratch</p>
              </button>

              {/* Template grid */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-txt-faint uppercase tracking-wider">Templates</p>
                  {templates.map(t => {
                    const typeInfo = SESSION_TYPES[t.sessionType];
                    return (
                      <button
                        key={t.id}
                        onClick={() => handlePickTemplate(t)}
                        className="w-full text-left px-3 py-3 rounded-lg border border-surface-5 hover:border-accent/40 bg-surface-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeInfo?.color ?? '#888' }} />
                          <span className="text-sm font-medium text-txt">{t.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-txt-faint">
                          <span>{typeInfo?.label}</span>
                          <span>{t.duration} min</span>
                          <span>Intensity {t.intensity}/10</span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-txt-faint mt-1 line-clamp-1">{t.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Switch to Match */}
              <div className="pt-2 border-t border-surface-5">
                <button
                  onClick={() => setEventType('match')}
                  className="text-xs text-txt-faint hover:text-accent transition-colors"
                >
                  Add a match instead
                </button>
              </div>
            </>
          )}

          {/* Step 2: Form (practice or match) */}
          {step === 'form' && (
            <>
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-lg">
                <button
                  onClick={() => { setEventType('practice'); if (!selectedTemplate) setStep('pick'); }}
                  className={`py-2 rounded-md text-sm font-medium transition-colors ${
                    eventType === 'practice'
                      ? 'bg-accent text-surface-0'
                      : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => setEventType('match')}
                  className={`py-2 rounded-md text-sm font-medium transition-colors ${
                    eventType === 'match'
                      ? 'bg-accent text-surface-0'
                      : 'text-txt-muted hover:text-txt'
                  }`}
                >
                  Match
                </button>
              </div>

              {/* Template badge + back link */}
              {eventType === 'practice' && selectedTemplate && (
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40">
                    {selectedTemplate.name}
                  </span>
                  <button
                    onClick={() => { setStep('pick'); setSelectedTemplate(null); setTemplateFields(null); setFocus(''); }}
                    className="text-xs text-txt-faint hover:text-accent transition-colors"
                  >
                    Change template
                  </button>
                </div>
              )}

              {eventType === 'practice' && !selectedTemplate && (
                <button
                  onClick={() => setStep('pick')}
                  className="text-xs text-txt-faint hover:text-accent transition-colors"
                >
                  ← Browse templates
                </button>
              )}

              {/* Conditional fields */}
              {eventType === 'practice' ? (
                <Input
                  label="Session Focus"
                  placeholder='e.g., "Possession"'
                  value={focus}
                  onChange={e => setFocus(e.target.value)}
                  autoFocus
                />
              ) : (
                <>
                  <Input
                    label="Opponent"
                    placeholder="Opponent name"
                    value={opponent}
                    onChange={e => setOpponent(e.target.value)}
                    autoFocus
                  />
                  <Input
                    label="Location"
                    placeholder="Optional"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </>
              )}

              <TimePicker label="Time" value={time} onChange={setTime} />
            </>
          )}
        </div>

        {/* Footer — only show on form step */}
        {step === 'form' && (
          <div className="px-4 py-3 border-t border-surface-5 shrink-0">
            <Button onClick={handleCreate} disabled={!canCreate || creating} className="w-full">
              {creating ? 'Creating...' : `Create ${eventType === 'match' ? 'Match' : 'Practice'}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
