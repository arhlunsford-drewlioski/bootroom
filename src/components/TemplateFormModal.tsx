import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SessionTemplate, SessionType, SessionTemplateActivity, ActivityCategory } from '../db/database';
import { ACTIVITY_CATEGORIES } from '../constants/activities';
import { UNIT_TAGS, PHASE_TAGS } from '../constants/tags';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import TagPicker from './ui/TagPicker';

interface TemplateFormModalProps {
  open: boolean;
  template?: SessionTemplate;
  onClose: () => void;
  onSaved?: () => void;
}

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'tactical', label: 'Tactical' },
  { value: 'physical', label: 'Physical' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'recovery', label: 'Recovery' },
];

const SLOTS = [
  { key: 'warmup' as const, label: 'Warmup' },
  { key: 'activity1' as const, label: 'Activity 1' },
  { key: 'activity2' as const, label: 'Activity 2' },
  { key: 'activity3' as const, label: 'Activity 3' },
  { key: 'activity4' as const, label: 'Activity 4' },
];

type SlotKey = 'warmup' | 'activity1' | 'activity2' | 'activity3' | 'activity4';

export default function TemplateFormModal({ open, template, onClose, onSaved }: TemplateFormModalProps) {
  const [name, setName] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('technical');
  const [focus, setFocus] = useState('');
  const [duration, setDuration] = useState(90);
  const [intensity, setIntensity] = useState(5);
  const [description, setDescription] = useState('');
  const [slotMap, setSlotMap] = useState<Record<SlotKey, number | null>>({
    warmup: null, activity1: null, activity2: null, activity3: null, activity4: null,
  });
  const [unitTags, setUnitTags] = useState<string[]>([]);
  const [phaseTags, setPhaseTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const activities = useLiveQuery(() => db.activities.toArray(), []) ?? [];

  useEffect(() => {
    if (open) {
      setName(template?.name ?? '');
      setSessionType(template?.sessionType ?? 'technical');
      setFocus(template?.focus ?? '');
      setDuration(template?.duration ?? 90);
      setIntensity(template?.intensity ?? 5);
      setDescription(template?.description ?? '');
      setUnitTags(template?.unitTags ?? []);
      setPhaseTags(template?.phaseTags ?? []);

      const map: Record<SlotKey, number | null> = {
        warmup: null, activity1: null, activity2: null, activity3: null, activity4: null,
      };
      if (template?.activities) {
        for (const a of template.activities) {
          map[a.slot] = a.activityId;
        }
      }
      setSlotMap(map);
    }
  }, [open, template]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSave = name.trim().length > 0 && focus.trim().length > 0;

  // Group activities by category for the select dropdowns
  const grouped = new Map<ActivityCategory, typeof activities>();
  for (const a of activities) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const activityList: SessionTemplateActivity[] = [];
      for (const slot of SLOTS) {
        const actId = slotMap[slot.key];
        if (actId) activityList.push({ activityId: actId, slot: slot.key });
      }

      const data = {
        name: name.trim(),
        sessionType,
        focus: focus.trim(),
        duration,
        intensity,
        description: description.trim(),
        activities: activityList,
        unitTags,
        phaseTags,
        isBuiltIn: 0 as const,
      };

      if (template?.id) {
        await db.sessionTemplates.update(template.id, data);
      } else {
        await db.sessionTemplates.add(data);
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-1 w-full sm:max-w-lg sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <h3 className="text-sm font-semibold text-txt">{template ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <Input label="Template Name" placeholder="e.g., Match Day -2" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Session Type" value={sessionType} onChange={e => setSessionType(e.target.value as SessionType)}>
              {SESSION_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input label="Focus" placeholder="e.g., Possession" value={focus} onChange={e => setFocus(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (min)" type="number" min={15} max={180} value={duration} onChange={e => setDuration(Number(e.target.value))} />
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Intensity ({intensity}/10)</label>
              <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} className="w-full h-9 accent-cyan" />
            </div>
          </div>

          <Textarea label="Description" placeholder="What this session is about..." rows={2} value={description} onChange={e => setDescription(e.target.value)} />

          {/* Activity Slots */}
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-2">Activities</label>
            <div className="space-y-2">
              {SLOTS.map(slot => (
                <div key={slot.key} className="flex items-center gap-2">
                  <span className="text-xs text-txt-faint w-20 shrink-0">{slot.label}</span>
                  <select
                    value={slotMap[slot.key] ?? ''}
                    onChange={e => setSlotMap(prev => ({ ...prev, [slot.key]: e.target.value ? Number(e.target.value) : null }))}
                    className="h-9 flex-1 rounded-md border border-surface-5 bg-surface-0 px-3 text-sm text-txt focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-colors"
                  >
                    <option value="">— None —</option>
                    {Array.from(grouped.entries()).map(([cat, acts]) => (
                      <optgroup key={cat} label={ACTIVITY_CATEGORIES[cat].label}>
                        {acts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.suggestedDuration}min)</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <TagPicker label="Unit Tags" options={UNIT_TAGS} selected={unitTags} onChange={setUnitTags} max={3} />
          <TagPicker label="Phase Tags" options={PHASE_TAGS} selected={phaseTags} onChange={setPhaseTags} max={4} allowCustom />
        </div>

        <div className="px-4 py-3 border-t border-surface-5 shrink-0">
          <Button onClick={handleSave} disabled={!canSave || saving} className="w-full">
            {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
