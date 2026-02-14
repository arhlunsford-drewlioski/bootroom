import { db } from './database';
import type { SessionTemplateActivity } from './database';
import { BUILTIN_ACTIVITIES } from '../constants/activities';
import { BUILTIN_TEMPLATES } from '../constants/session-templates';

export async function seedBuiltInData(): Promise<void> {
  await db.transaction('rw', [db.activities, db.sessionTemplates], async () => {
    // Purge ALL old built-in records. We need to scan the full table because
    // legacy records stored isBuiltIn as boolean `true` which is not a valid
    // IndexedDB key and can't be found via .where().equals().
    const allActivities = await db.activities.toArray();
    const oldActivityIds = allActivities
      .filter(a => a.isBuiltIn)
      .map(a => a.id!)
      .filter(Boolean);
    if (oldActivityIds.length) await db.activities.bulkDelete(oldActivityIds);

    const allTemplates = await db.sessionTemplates.toArray();
    const oldTemplateIds = allTemplates
      .filter(t => t.isBuiltIn)
      .map(t => t.id!)
      .filter(Boolean);
    if (oldTemplateIds.length) await db.sessionTemplates.bulkDelete(oldTemplateIds);

    // Insert one clean set of built-in activities
    const activityIds = await db.activities.bulkAdd(
      BUILTIN_ACTIVITIES.map(a => ({ ...a })),
      { allKeys: true },
    );

    // Build name → id map for template resolution
    const nameToId = new Map<string, number>();
    BUILTIN_ACTIVITIES.forEach((a, i) => {
      nameToId.set(a.name, activityIds[i] as number);
    });

    const templates = BUILTIN_TEMPLATES.map(t => ({
      name: t.name,
      sessionType: t.sessionType,
      focus: t.focus,
      duration: t.duration,
      intensity: t.intensity,
      description: t.description,
      isBuiltIn: 1 as const,
      unitTags: t.unitTags,
      phaseTags: t.phaseTags,
      activities: t.activitySlots
        .map(slot => {
          const actId = nameToId.get(slot.activityName);
          if (!actId) return null;
          return { activityId: actId, slot: slot.slot } as SessionTemplateActivity;
        })
        .filter((x): x is SessionTemplateActivity => x !== null),
    }));

    await db.sessionTemplates.bulkAdd(templates);
  });
}
