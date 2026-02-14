import { useState, useEffect } from 'react';
import { db } from '../db/database';
import type { Activity, ActivityCategory } from '../db/database';
import { ACTIVITY_CATEGORIES } from '../constants/activities';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Textarea from './ui/Textarea';

interface ActivityFormModalProps {
  open: boolean;
  activity?: Activity; // undefined = create, defined = edit
  onClose: () => void;
  onSaved?: () => void;
}

const categories = Object.entries(ACTIVITY_CATEGORIES) as [ActivityCategory, { label: string }][];

export default function ActivityFormModal({ open, activity, onClose, onSaved }: ActivityFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('technical');
  const [duration, setDuration] = useState(15);
  const [intensity, setIntensity] = useState(5);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(activity?.name ?? '');
      setCategory(activity?.category ?? 'technical');
      setDuration(activity?.suggestedDuration ?? 15);
      setIntensity(activity?.intensity ?? 5);
      setDescription(activity?.description ?? '');
    }
  }, [open, activity]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        category,
        suggestedDuration: duration,
        intensity,
        description: description.trim(),
        isBuiltIn: false,
      };
      if (activity?.id) {
        await db.activities.update(activity.id, data);
      } else {
        await db.activities.add(data);
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
        className="bg-surface-1 w-full sm:max-w-md sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <h3 className="text-sm font-semibold text-txt">{activity ? 'Edit Activity' : 'New Activity'}</h3>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <Input label="Name" placeholder="e.g., 5v2 Rondo" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <Select label="Category" value={category} onChange={e => setCategory(e.target.value as ActivityCategory)}>
            {categories.map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (min)"
              type="number"
              min={5}
              max={60}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            />
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Intensity ({intensity}/10)</label>
              <input
                type="range"
                min={1}
                max={10}
                value={intensity}
                onChange={e => setIntensity(Number(e.target.value))}
                className="w-full h-9 accent-cyan"
              />
            </div>
          </div>

          <Textarea
            label="Description"
            placeholder="Brief description of the activity..."
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="px-4 py-3 border-t border-surface-5 shrink-0">
          <Button onClick={handleSave} disabled={!canSave || saving} className="w-full">
            {saving ? 'Saving...' : activity ? 'Save Changes' : 'Create Activity'}
          </Button>
        </div>
      </div>
    </div>
  );
}
