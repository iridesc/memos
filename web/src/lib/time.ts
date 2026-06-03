export type PlanTimeState = "not-started" | "in-progress" | "expired";

export interface TimeWithUnit {
  value: number;
  unit: "minute" | "hour" | "day" | "month";
}

export interface FormattedPlanTime {
  state: PlanTimeState;
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

/**
 * Classifies a plan time into one of three states and computes relative time offsets.
 *
 * Three states:
 * - not-started: plan_start_time is in the future
 * - in-progress: plan_start_time is in the past, plan_end_time is in the future
 * - expired: both plan times are in the past
 *
 * Time values use the single largest appropriate unit with up to 1 decimal place.
 * Whole numbers strip the trailing ".0".
 */
export function formatRelativePlanTime(start: Date, end: Date, now: Date): FormattedPlanTime {
  const startDiffMs = start.getTime() - now.getTime();
  const endDiffMs = end.getTime() - now.getTime();
  const durationMs = end.getTime() - start.getTime();

  // Expired: both start and end are in the past
  if (endDiffMs < 0) {
    return { state: "expired" };
  }

  // Not started: start is in the future
  if (startDiffMs > 0) {
    const duration = toTimeWithUnit(durationMs);
    // Imminent: less than 60 seconds until start
    if (startDiffMs < 60_000) {
      return { state: "not-started", duration, isStartImminent: true };
    }
    const startOffset = toTimeWithUnit(startDiffMs);
    return { state: "not-started", startOffset, duration };
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
 * with up to 1 decimal place. Whole numbers have ".0" stripped.
 */
function toTimeWithUnit(diffMs: number): TimeWithUnit {
  const absMs = Math.abs(diffMs);
  const minutes = absMs / 60_000;

  // Less than 60 minutes: display in minutes (no decimal needed)
  if (minutes < 60) {
    return { value: Math.max(1, Math.round(minutes)), unit: "minute" };
  }

  const hours = minutes / 60;

  // Less than 24 hours: display in hours with 1 decimal
  if (hours < 24) {
    const value = roundToDecimal(hours);
    return { value: stripTrailingZero(value), unit: "hour" };
  }

  const days = hours / 24;

  // Less than 30 days: display in days with 1 decimal
  if (days < 30) {
    const value = roundToDecimal(days);
    return { value: stripTrailingZero(value), unit: "day" };
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
