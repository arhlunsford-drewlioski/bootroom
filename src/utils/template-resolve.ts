import { db } from '../db/database';
import type { SessionTemplate, Practice, ActivityRef } from '../db/database';

export async function resolveTemplateToFields(
  template: SessionTemplate,
): Promise<Partial<Practice>> {
  const activityIds = template.activities.map(a => a.activityId);
  const activities = await db.activities.bulkGet(activityIds);

  const fields: Partial<Practice> = {
    focus: template.focus,
    sessionType: template.sessionType,
    intensity: template.intensity,
    duration: template.duration,
    unitTags: template.unitTags,
    phaseTags: template.phaseTags,
    templateId: template.id,
  };

  for (const slotDef of template.activities) {
    const idx = activityIds.indexOf(slotDef.activityId);
    const activity = idx >= 0 ? activities[idx] : undefined;
    if (!activity) continue;

    const ref: ActivityRef = { activityId: slotDef.activityId, activityName: activity.name };
    const text = `${activity.name} — ${activity.description}`;

    switch (slotDef.slot) {
      case 'warmup':    fields.warmup = text; fields.warmupRef = ref; break;
      case 'activity1': fields.activity1 = text; fields.activity1Ref = ref; break;
      case 'activity2': fields.activity2 = text; fields.activity2Ref = ref; break;
      case 'activity3': fields.activity3 = text; fields.activity3Ref = ref; break;
      case 'activity4': fields.activity4 = text; fields.activity4Ref = ref; break;
    }
  }

  return fields;
}
