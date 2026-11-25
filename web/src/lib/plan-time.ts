/**
 * Preset plan time windows offered by the memo editor toolbar.
 *
 * Two families, deliberately kept visally separated in the popover:
 * - `relative`: starts a fixed delay from now and runs until the end of that day.
 * - `fixed`: starts at a wall-clock hour on a calendar-derived day (tomorrow)
 *   and runs until the end of that day.
 *
 * Every preset therefore describes a window inside one calendar day.
 *
 * Days that need more than one candidate (this week, this month) are not
 * presets but pickers: the toolbar opens a day grid and the picked day is
 * turned into the same kind of window by `createDayPlanTimeRange`.
 */
export type PlanTimePreset =
  | { id: string; kind: "relative"; delayMinutes: number }
  | { id: string; kind: "fixed"; offset: "tomorrow"; hour: number };

/** The calendar scopes the toolbar can offer as a day picker. */
export type PlanTimePickerScope = "week" | "month";

/** Hour a fixed preset starts at: the working day begins at 09:00 local time. */
const FIXED_PRESET_HOUR = 9;

const RELATIVE_PRESETS: readonly PlanTimePreset[] = [
  { id: "after-15m", kind: "relative", delayMinutes: 15 },
  { id: "after-60m", kind: "relative", delayMinutes: 60 },
  { id: "after-180m", kind: "relative", delayMinutes: 180 },
];

/** The "tomorrow" preset: starts at 09:00 and runs until the end of that day. */
export const PLAN_TIME_TOMORROW_PRESET: PlanTimePreset = {
  id: "tomorrow",
  kind: "fixed",
  offset: "tomorrow",
  hour: FIXED_PRESET_HOUR,
};

/** Presets that plan a window starting a fixed delay from now. */
export const PLAN_TIME_RELATIVE_PRESETS = RELATIVE_PRESETS;

/** All presets offered as a single click in the toolbar. */
export const PLAN_TIME_PRESETS: readonly PlanTimePreset[] = [...RELATIVE_PRESETS, PLAN_TIME_TOMORROW_PRESET];

/** Presets used to seed the custom panel when the memo has no plan time yet. */
export const DEFAULT_PLAN_TIME_PRESET = PLAN_TIME_PRESETS[0];

/** End of the local day that contains `date`. */
function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Whether both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * The Monday of the week that contains `from`.
 *
 * Weeks start on Monday here, matching how "this week" is read in the editor
 * and how the presets used to describe the coming Monday.
 */
export function startOfWeek(from: Date): Date {
  const daysSinceMonday = (from.getDay() + 6) % 7;
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() - daysSinceMonday);
}

/** The seven days of the week that contains `from`, Monday first. */
export function weekDaysOf(from: Date): Date[] {
  const start = startOfWeek(from);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** All days of the month that contains `from`. */
export function monthDaysOf(from: Date): Date[] {
  const year = from.getFullYear();
  const month = from.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

/** Number of empty cells before the 1st of the month in a Monday-first grid. */
export function monthLeadingBlanks(from: Date): number {
  return (new Date(from.getFullYear(), from.getMonth(), 1).getDay() + 6) % 7;
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

  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const planStartTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), preset.hour, 0, 0, 0);
  return { planStartTime, planEndTime: endOfDay(planStartTime) };
}

/**
 * Build the plan window for a day picked in the week or month grid.
 *
 * Days in the future start at 09:00, the same hour the presets use; the
 * current day starts right now so that a plan never begins in the past.
 */
export function createDayPlanTimeRange(day: Date, now: Date) {
  const planStartTime = isSameDay(day, now)
    ? new Date(now.getTime())
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), FIXED_PRESET_HOUR, 0, 0, 0);
  return { planStartTime, planEndTime: endOfDay(planStartTime) };
}

/**
 * The next five-minute mark at or after `now`.
 *
 * The result is never earlier than `now`, so a plan window built from it can
 * never start in the past. Seconds and milliseconds are dropped, which is
 * why the mark is rounded up rather than down.
 */
export function nextFiveMinuteMark(now: Date): Date {
  return new Date(Math.ceil(now.getTime() / (5 * 60 * 1000)) * 5 * 60 * 1000);
}

/**
 * Move a plan window that already started forward to the current time.
 *
 * The editor prefills a plan window when it opens and keeps it while the
 * editor stays open, so a window can be stale by the time the user saves.
 * The API rejects a plan start time in the past, so instead of failing the
 * save the window is moved: the start becomes now, and the end keeps the
 * originally planned duration whenever it is still ahead of the new start.
 */
export function shiftStalePlanTimeRange(
  range: { planStartTime?: Date; planEndTime?: Date },
  now: Date,
): { planStartTime?: Date; planEndTime?: Date; shifted: boolean } {
  const { planStartTime, planEndTime } = range;
  if (!planStartTime || !planEndTime) {
    return { planStartTime, planEndTime, shifted: false };
  }
  if (planStartTime.getTime() >= now.getTime()) {
    return { planStartTime, planEndTime, shifted: false };
  }

  const planStart = nextFiveMinuteMark(now);
  const duration = Math.max(planEndTime.getTime() - planStartTime.getTime(), 5 * 60 * 1000);
  const planEnd = planEndTime.getTime() > planStart.getTime() ? planEndTime : new Date(planStart.getTime() + duration);
  return { planStartTime: planStart, planEndTime: planEnd, shifted: true };
}
