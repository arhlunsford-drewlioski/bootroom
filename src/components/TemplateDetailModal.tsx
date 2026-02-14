import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SessionTemplate } from '../db/database';
import { ACTIVITY_CATEGORIES } from '../constants/activities';
import { SESSION_TYPES } from '../constants/periodization';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';

interface TemplateDetailModalProps {
  templateId: number;
  onClose: () => void;
  onEdit?: (template: SessionTemplate) => void;
  onDuplicate?: (template: SessionTemplate) => void;
}

export default function TemplateDetailModal({ templateId, onClose, onEdit, onDuplicate }: TemplateDetailModalProps) {
  const [showDelete, setShowDelete] = useState(false);

  const template = useLiveQuery(() => db.sessionTemplates.get(templateId), [templateId]);
  const activities = useLiveQuery(() => db.activities.toArray(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!template || !activities) return null;

  const activityMap = new Map(activities.map(a => [a.id, a]));
  const typeInfo = SESSION_TYPES[template.sessionType];

  const handleDelete = async () => {
    await db.sessionTemplates.delete(templateId);
    onClose();
  };

  const handleDuplicate = async () => {
    const copy = { ...template, id: undefined, name: `${template.name} (Copy)`, isBuiltIn: 0 as const };
    await db.sessionTemplates.add(copy);
    onDuplicate?.(copy as SessionTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-surface-1 w-full sm:max-w-md sm:rounded-lg border border-surface-5 rounded-t-2xl sm:rounded-t-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: typeInfo?.color ?? '#888' }}
            />
            <h3 className="text-sm font-semibold text-txt truncate">{template.name}</h3>
          </div>
          <button onClick={onClose} className="text-txt-faint hover:text-txt transition-colors text-sm p-1 shrink-0">✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full border border-surface-5 text-txt-muted">{typeInfo?.label ?? template.sessionType}</span>
            <span className="px-2 py-0.5 rounded-full border border-surface-5 text-txt-muted">{template.duration} min</span>
            <span className="px-2 py-0.5 rounded-full border border-surface-5 text-txt-muted">Intensity {template.intensity}/10</span>
            {template.isBuiltIn && (
              <span className="px-2 py-0.5 rounded-full border border-accent/30 text-accent">Built-in</span>
            )}
          </div>

          {/* Focus */}
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-1">Focus</label>
            <p className="text-sm text-txt">{template.focus}</p>
          </div>

          {template.description && (
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Description</label>
              <p className="text-sm text-txt-muted">{template.description}</p>
            </div>
          )}

          {/* Activities */}
          <div>
            <label className="block text-xs font-medium text-txt-muted mb-2">Activities</label>
            <div className="space-y-2">
              {template.activities.map((slot, i) => {
                const act = activityMap.get(slot.activityId);
                if (!act) return null;
                const catInfo = ACTIVITY_CATEGORIES[act.category];
                return (
                  <div key={i} className="flex items-start gap-3 bg-surface-2 rounded-md p-3">
                    <span className="text-[10px] uppercase text-txt-faint w-16 shrink-0 pt-0.5">{slot.slot === 'warmup' ? 'Warmup' : slot.slot.replace('activity', 'Act ')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-txt">{act.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: catInfo.color + '20', color: catInfo.color }}>
                          {catInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-txt-muted mt-0.5">{act.description}</p>
                      <p className="text-[10px] text-txt-faint mt-1">{act.suggestedDuration} min · Intensity {act.intensity}/10</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          {(template.unitTags?.length || template.phaseTags?.length) ? (
            <div className="flex flex-wrap gap-1.5">
              {template.unitTags?.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-accent/20 text-accent border border-accent/40">{t}</span>
              ))}
              {template.phaseTags?.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-surface-3 text-txt-muted border border-surface-5">{t}</span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-5 shrink-0 flex gap-2">
          {template.isBuiltIn ? (
            <>
              <Button onClick={handleDuplicate} className="flex-1">Duplicate & Edit</Button>
              <Button variant="secondary" onClick={() => setShowDelete(true)}>Delete</Button>
            </>
          ) : (
            <>
              <Button onClick={() => onEdit?.(template)} className="flex-1">Edit</Button>
              <Button variant="secondary" onClick={() => setShowDelete(true)}>Delete</Button>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        title="Delete Template"
        message={`Delete "${template.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
