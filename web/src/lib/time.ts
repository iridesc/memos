export type PlanTimeState = "not-started" | "in-progress" | "expired";

export interface TimeWithUnit {
  value: number;
  unit: "minute" | "hour" | "day" | "month";
}

export interface FormattedPlanTime {
  state: PlanTimeState;
  /** Local calendar days from now to plan start (only for not-started state) */
  dayOffset?: number;
  /** Local calendar days since plan end (only for expired state; 0 = same day) */
  expiredDays?: number;
  /** Time from now to plan start (only for not-started state, when not imminent) */
  startOffset?: TimeWithUnit;
  /** Total duration from plan start to plan end (only for not-started state) */
  duration?: TimeWithUnit;
  /** Time from now to plan end (only for in-progress state, when not imminent) */
  remaining?: TimeWithUnit;
  /** Plan start is less than 60 seconds away */
  isStartImminent?: boolean;
  /** Plan end is less than 60 seconds away (in-progress state) */
  isEndImminent?: boolean;
}

/** Describes a future plan date with calendar-day buckets: 明天 / 后天 / x天后 / x周后 / x月后 / x年后. */
export type PlanWhen =
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "day-after" }
  | { kind: "days"; count: number }
  | { kind: "weeks"; count: number }
  | { kind: "months"; count: number }
  | { kind: "years"; count: number };

/**
 * Buckets a calendar-day offset into a human phrase tier.
 *
 * - 1 / 2 days map to the dedicated 明天 / 后天 words.
 * - 3–6 days use the day count.
 * - 7–29 days use whole weeks (rounded, minimum 1).
 * - 30–344 days use whole months (rounded, minimum 1).
 * - 345+ days use whole years (rounded, minimum 1).
 */
export function describePlanWhen(dayOffset: number): PlanWhen {
  if (dayOffset <= 0) return { kind: "today" };
  if (dayOffset === 1) return { kind: "tomorrow" };
  if (dayOffset === 2) return { kind: "day-after" };
  if (dayOffset <= 6) return { kind: "days", count: dayOffset };
  if (dayOffset <= 29) return { kind: "weeks", count: Math.max(1, Math.round(dayOffset / 7)) };
  if (dayOffset <= 344) return { kind: "months", count: Math.max(1, Math.round(dayOffset / 30)) };
  return { kind: "years", count: Math.max(1, Math.round(dayOffset / 365)) };
}

/** Signed count of local calendar days between two dates (a - b), robust across DST. */
function localDayDiff(a: Date, b: Date): number {
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((aDay - bDay) / 86_400_000);
}

/**
 * Classifies a plan time into one of three states and computes relative time offsets.
 *
 * Three states:
 * - not-started: plan_start_time is in the future
 * - in-progress: plan_start_time is in the past, plan_end_time is in the future
 * - expired: both plan times are in the past
 *
 * Offsets are calendar-based (dayOffset / expiredDays) for day-level phrasing,
 * while startOffset / remaining / duration keep the largest-unit values with up
 * to 1 decimal place. Whole numbers strip the trailing ".0".
 */
export function formatRelativePlanTime(start: Date, end: Date, now: Date): FormattedPlanTime {
  const startDiffMs = start.getTime() - now.getTime();
  const endDiffMs = end.getTime() - now.getTime();
  const durationMs = end.getTime() - start.getTime();

  // Expired: both start and end are in the past
  if (endDiffMs < 0) {
    return { state: "expired", expiredDays: localDayDiff(now, end) };
  }

  // Not started: start is in the future
  if (startDiffMs > 0) {
    const duration = toTimeWithUnit(durationMs);
    const dayOffset = localDayDiff(start, now);
    // Imminent: less than 60 seconds until start
    if (startDiffMs < 60_000) {
      return { state: "not-started", dayOffset, duration, isStartImminent: true };
    }
    const startOffset = toTimeWithUnit(startDiffMs);
    return { state: "not-started", dayOffset, startOffset, duration };
  }

  // In progress: start is past, end is future
  // Imminent end: less than 60 seconds until end
  if (endDiffMs < 60_000) {
    return { state: "in-progress", isEndImminent: true };
  }
  const remaining = toTimeWithUnit(endDiffMs);
  return { state: "in-progress", remaining };
}

/**
 * Converts a millisecond time difference to the largest appropriate time unit
 * with up to 1 decimal place. Whole numbers have ".0" stripped, and values that
 * round up to the next unit (59.99min → 1h, 23.99h → 1d, 29.9d → 1mo) are promoted.
 */
function toTimeWithUnit(diffMs: number): TimeWithUnit {
  const absMs = Math.abs(diffMs);
  const minutes = absMs / 60_000;

  // Less than 60 minutes: display in minutes (no decimal needed)
  if (minutes < 60) {
    const value = Math.max(1, Math.round(minutes));
    if (value >= 60) {
      return { value: 1, unit: "hour" };
    }
    return { value, unit: "minute" };
  }

  const hours = minutes / 60;

  // Less than 24 hours: display in hours with 1 decimal
  if (hours < 24) {
    const value = stripTrailingZero(roundToDecimal(hours));
    if (value >= 24) {
      return { value: 1, unit: "day" };
    }
    return { value, unit: "hour" };
  }

  const days = hours / 24;

  // Less than 30 days: display in days with 1 decimal
  if (days < 30) {
    const value = stripTrailingZero(roundToDecimal(days));
    if (value >= 30) {
      return { value: 1, unit: "month" };
    }
    return { value, unit: "day" };
  }

  // 30+ days: display in months with 1 decimal
  const months = days / 30;
  const value = roundToDecimal(months);
  return { value: stripTrailingZero(value), unit: "month" };
}

function roundToDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function stripTrailingZero(value: number): number {
  return value % 1 === 0 ? Math.round(value) : value;
}
