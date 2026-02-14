import { db } from './database';
import type { SessionTemplateActivity } from './database';
import { BUILTIN_ACTIVITIES } from '../constants/activities';
import { BUILTIN_TEMPLATES } from '../constants/session-templates';

export async function seedBuiltInData(): Promise<void> {
  const existingCount = await db.activities.where('isBuiltIn').equals(1).count();
  if (existingCount > 0) return;

  await db.transaction('rw', [db.activities, db.sessionTemplates], async () => {
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
      isBuiltIn: true as const,
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
