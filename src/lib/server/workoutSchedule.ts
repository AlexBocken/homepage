import { WorkoutSchedule } from '$models/WorkoutSchedule';

/**
 * Advance the rotation pointer after a workout using `templateId` was logged.
 *
 * Starting from the slot we currently expect next, we look forward (wrapping)
 * for the template that was actually done:
 *  - If it's the slot we expected, the pointer simply steps forward one.
 *  - If it's a different template that still appears later in the rotation, we
 *    re-anchor the pointer to just after that slot, so the schedule follows what
 *    the user actually did rather than what was planned.
 *  - If the template isn't part of the rotation at all, the pointer is left
 *    untouched (an off-schedule one-off shouldn't disturb the rhythm).
 *
 * Best-effort: callers should not fail the workout save if this throws.
 */
export async function advanceSchedulePointer(userId: string, templateId: string): Promise<void> {
  if (!templateId) return;

  const schedule = await WorkoutSchedule.findOne({ userId });
  if (!schedule || schedule.templateOrder.length === 0) return;

  const order = schedule.templateOrder.map(String);
  const len = order.length;
  const tid = String(templateId);
  const start = (((schedule.position ?? 0) % len) + len) % len;

  let found = -1;
  for (let i = 0; i < len; i++) {
    const j = (start + i) % len;
    if (order[j] === tid) {
      found = j;
      break;
    }
  }
  if (found === -1) return; // not part of the rotation

  schedule.position = (found + 1) % len;
  await schedule.save();
}
