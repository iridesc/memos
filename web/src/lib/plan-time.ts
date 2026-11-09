/**
 * Preset plan time windows offered by the memo editor toolbar.
 *
 * Two families, deliberately kept visally separated in the popover:
 * - `relative`: starts a fixed delay from now and runs until the end of that day.
 * - `fixed`: starts at a wall-clock hour on a calendar-derived day (tomorrow /
 *   next Monday / the 1st of next month) and runs until the end of that day.
 *
 * Every preset therefore describes a window inside one calendar day.
 */
export type PlanTimePreset =
  | { id: string; kind: "relative"; delayMinutes: number }
  | { id: string; kind: "fixed"; offset: "tomorrow" | "nextWeek" | "nextMonth"; hour: number };

/** Hour a fixed preset starts at: the working day begins at 09:00 local time. */
const FIXED_PRESET_HOUR = 9;

export const PLAN_TIME_PRESETS: readonly PlanTimePreset[] = [
  { id: "after-15m", kind: "relative", delayMinutes: 15 },
  { id: "after-60m", kind: "relative", delayMinutes: 60 },
  { id: "after-180m", kind: "relative", delayMinutes: 180 },
  { id: "tomorrow", kind: "fixed", offset: "tomorrow", hour: FIXED_PRESET_HOUR },
  { id: "next-week", kind: "fixed", offset: "nextWeek", hour: FIXED_PRESET_HOUR },
  { id: "next-month", kind: "fixed", offset: "nextMonth", hour: FIXED_PRESET_HOUR },
];

/** Presets used to seed the custom panel when the memo has no plan time yet. */
export const DEFAULT_PLAN_TIME_PRESET = PLAN_TIME_PRESETS[0];

/** End of the local day that contains `date`. */
function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * The Monday of the next calendar week.
 *
 * Weeks start on Monday here regardless of the instance's first-weekday setting,
 * because the preset is labelled "next week" and users read that as the coming
 * Monday. When today is already Monday the result is seven days out.
 */
function nextWeekMonday(from: Date): Date {
  const daysUntilMonday = (1 - from.getDay() + 7) % 7 || 7;
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysUntilMonday);
}

/** The 1st of the next calendar month (rolls over into January correctly). */
function nextMonthFirst(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 1);
}

/** Build a quick plan from the operation time through the end of its start day. */
export function createQuickPlanTimeRange(operationTime: Date, delayMinutes: number) {
  const planStartTime = new Date(operationTime.getTime() + delayMinutes * 60 * 1000);
  return { planStartTime, planEndTime: endOfDay(planStartTime) };
}

/** Build the plan window described by a toolbar preset. */
export function createPresetPlanTimeRange(preset: PlanTimePreset, now: Date) {
  if (preset.kind === "relative") {
    return createQuickPlanTimeRange(now, preset.delayMinutes);
  }

  const day =
    preset.offset === "tomorrow"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      : preset.offset === "nextWeek"
        ? nextWeekMonday(now)
        : nextMonthFirst(now);
  const planStartTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), preset.hour, 0, 0, 0);
  return { planStartTime, planEndTime: endOfDay(planStartTime) };
}
