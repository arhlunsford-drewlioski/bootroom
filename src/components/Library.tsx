import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Activity, ActivityCategory, SessionTemplate } from '../db/database';
import { ACTIVITY_CATEGORIES } from '../constants/activities';
import { SESSION_TYPES } from '../constants/periodization';
import Button from './ui/Button';
import Card from './ui/Card';
import ConfirmDialog from './ui/ConfirmDialog';
import ActivityFormModal from './ActivityFormModal';
import TemplateFormModal from './TemplateFormModal';
import TemplateDetailModal from './TemplateDetailModal';

type Tab = 'templates' | 'activities';
type CategoryFilter = ActivityCategory | 'all';

const categoryEntries = Object.entries(ACTIVITY_CATEGORIES) as [ActivityCategory, { label: string; color: string }][];

export default function Library() {
  const [tab, setTab] = useState<Tab>('templates');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Activity modal state
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);

  // Template modal state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | undefined>();
  const [detailTemplateId, setDetailTemplateId] = useState<number | null>(null);

  const activities = useLiveQuery(() => db.activities.toArray(), []) ?? [];
  const templates = useLiveQuery(() => db.sessionTemplates.toArray(), []) ?? [];

  const filteredActivities = categoryFilter === 'all'
    ? activities
    : activities.filter(a => a.category === categoryFilter);

  const handleDeleteActivity = async () => {
    if (!deleteActivity?.id) return;
    await db.activities.delete(deleteActivity.id);
    setDeleteActivity(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-txt tracking-wide">Library</h2>
        <Button onClick={() => {
          if (tab === 'templates') {
            setEditingTemplate(undefined);
            setShowTemplateForm(true);
          } else {
            setEditingActivity(undefined);
            setShowActivityForm(true);
          }
        }}>
          + New {tab === 'templates' ? 'Template' : 'Activity'}
        </Button>
      </div>

      {/* Tab toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-surface-2 rounded-lg mb-4 max-w-xs">
        {(['templates', 'activities'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-accent text-surface-0' : 'text-txt-muted hover:text-txt'
            }`}
          >
            {t === 'templates' ? 'Templates' : 'Activities'}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map(t => {
            const typeInfo = SESSION_TYPES[t.sessionType];
            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-accent/40 transition-colors"
                onClick={() => setDetailTemplateId(t.id!)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: typeInfo?.color ?? '#888' }} />
                      <h3 className="text-sm font-semibold text-txt truncate">{t.name}</h3>
                    </div>
                    <p className="text-xs text-txt-muted truncate">{t.focus}</p>
                  </div>
                  {t.isBuiltIn && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-accent/30 text-accent shrink-0">Built-in</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-txt-faint">
                  <span>{typeInfo?.label ?? t.sessionType}</span>
                  <span>{t.duration} min</span>
                  <span>Intensity {t.intensity}/10</span>
                  <span>{t.activities.length} activities</span>
                </div>
                {t.description && (
                  <p className="text-xs text-txt-faint mt-2 line-clamp-2">{t.description}</p>
                )}
              </Card>
            );
          })}
          {templates.length === 0 && (
            <p className="text-sm text-txt-faint col-span-2 text-center py-8">No templates yet. Create one to get started.</p>
          )}
        </div>
      )}

      {/* Activities Tab */}
      {tab === 'activities' && (
        <>
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-surface-3 text-txt-muted border-surface-5 hover:bg-surface-4'
              }`}
            >
              All ({activities.length})
            </button>
            {categoryEntries.map(([key, { label, color }]) => {
              const count = activities.filter(a => a.category === key).length;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    categoryFilter === key
                      ? 'border-accent/40'
                      : 'bg-surface-3 border-surface-5 hover:bg-surface-4'
                  }`}
                  style={categoryFilter === key ? { backgroundColor: color + '20', color } : undefined}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredActivities.map(a => {
              const catInfo = ACTIVITY_CATEGORIES[a.category];
              return (
                <Card key={a.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-txt">{a.name}</h3>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: catInfo.color + '20', color: catInfo.color }}
                    >
                      {catInfo.label}
                    </span>
                  </div>
                  <p className="text-xs text-txt-muted line-clamp-2 flex-1">{a.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-3 text-[10px] text-txt-faint">
                      <span>{a.suggestedDuration} min</span>
                      <span>Intensity {a.intensity}/10</span>
                    </div>
                    <div className="flex gap-1">
                      {!a.isBuiltIn && (
                        <button
                          onClick={() => { setEditingActivity(a); setShowActivityForm(true); }}
                          className="text-[10px] text-txt-faint hover:text-accent transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteActivity(a)}
                        className="text-[10px] text-txt-faint hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {filteredActivities.length === 0 && (
              <p className="text-sm text-txt-faint col-span-3 text-center py-8">No activities in this category.</p>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <ActivityFormModal
        open={showActivityForm}
        activity={editingActivity}
        onClose={() => { setShowActivityForm(false); setEditingActivity(undefined); }}
      />

      <TemplateFormModal
        open={showTemplateForm}
        template={editingTemplate}
        onClose={() => { setShowTemplateForm(false); setEditingTemplate(undefined); }}
      />

      {detailTemplateId !== null && (
        <TemplateDetailModal
          templateId={detailTemplateId}
          onClose={() => setDetailTemplateId(null)}
          onEdit={(t) => {
            setDetailTemplateId(null);
            setEditingTemplate(t);
            setShowTemplateForm(true);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteActivity !== null}
        title="Delete Activity"
        message={`Delete "${deleteActivity?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDeleteActivity}
        onCancel={() => setDeleteActivity(null)}
      />
    </div>
  );
}
