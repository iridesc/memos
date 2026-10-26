export const PLAN_TIME_PRESETS = [5, 15, 30, 60, 180] as const;

/** Build a quick plan from the operation time through the end of its start day. */
export function createQuickPlanTimeRange(operationTime: Date, delayMinutes: number) {
  const planStartTime = new Date(operationTime.getTime() + delayMinutes * 60 * 1000);
  const planEndTime = new Date(planStartTime.getFullYear(), planStartTime.getMonth(), planStartTime.getDate(), 23, 59, 59, 999);
  return { planStartTime, planEndTime };
}
