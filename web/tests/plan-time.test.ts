import { describe, expect, it } from "vitest";
import { createQuickPlanTimeRange } from "@/lib/plan-time";
import { describePlanWhen, formatRelativePlanTime } from "@/lib/time";

describe("quick plan time ranges", () => {
  it("starts at the operation time plus the selected delay and ends that day", () => {
    const result = createQuickPlanTimeRange(new Date(2026, 9, 27, 10, 2, 30), 15);
    expect(result.planStartTime).toEqual(new Date(2026, 9, 27, 10, 17, 30));
    expect(result.planEndTime).toEqual(new Date(2026, 9, 27, 23, 59, 59, 999));
  });

  it("uses the following day when a delay crosses midnight", () => {
    const result = createQuickPlanTimeRange(new Date(2026, 9, 27, 23, 58), 5);
    expect(result.planStartTime).toEqual(new Date(2026, 9, 28, 0, 3));
    expect(result.planEndTime).toEqual(new Date(2026, 9, 28, 23, 59, 59, 999));
  });
});

describe("formatRelativePlanTime calendar offsets", () => {
  const now = new Date(2026, 10, 4, 15, 0, 0);
  const at = (dayOffset: number, hour: number, minute = 0) => new Date(2026, 10, 4 + dayOffset, hour, minute, 0, 0);
  const dayEnd = (dayOffset: number) => new Date(2026, 10, 4 + dayOffset, 23, 59, 59, 999);

  it("reports tomorrow for a plan starting after today ends, even if only a few minutes away", () => {
    const r = formatRelativePlanTime(new Date(2026, 10, 5, 0, 30), dayEnd(1), new Date(2026, 10, 4, 23, 50));
    expect(r.state).toBe("not-started");
    expect(r.dayOffset).toBe(1);
  });

  it("reports dayOffset 0 for a plan later today", () => {
    const r = formatRelativePlanTime(at(0, 18), dayEnd(0), now);
    expect(r.state).toBe("not-started");
    expect(r.dayOffset).toBe(0);
    expect(r.startOffset?.unit).toBe("hour");
  });

  it("keeps legacy offsets alongside the new dayOffset", () => {
    const r = formatRelativePlanTime(at(4, 9), dayEnd(4), now);
    expect(r.dayOffset).toBe(4);
    expect(r.startOffset?.unit).toBe("day");
    expect(r.duration?.unit).toBe("hour");
  });

  it("counts expiredDays as calendar days since the plan ended", () => {
    expect(formatRelativePlanTime(at(-1, 9), at(-1, 18), now).expiredDays).toBe(1);
    expect(formatRelativePlanTime(at(-3, 9), at(-3, 18), now).expiredDays).toBe(3);
    // Ended earlier today: still day 0, rendered as the plain expired label.
    expect(formatRelativePlanTime(at(0, 9), at(0, 14), now).expiredDays).toBe(0);
  });

  it("promotes durations that round up to the next unit", () => {
    // 59.99 minutes must not render as "60 minutes".
    expect(formatRelativePlanTime(at(1, 23), dayEnd(1), now).duration).toEqual({ value: 1, unit: "hour" });
    // 23h59m must not render as "24 hours".
    expect(
      formatRelativePlanTime(new Date(2026, 10, 5, 0, 1), new Date(2026, 10, 6, 0, 0), now).duration,
    ).toEqual({ value: 1, unit: "day" });
    // 29.98 days must not render as "30 days".
    expect(
      formatRelativePlanTime(new Date(2026, 10, 5, 0, 0), new Date(2026, 11, 4, 23, 59, 59), now).duration,
    ).toEqual({ value: 1, unit: "month" });
  });
});

describe("describePlanWhen buckets", () => {
  it("maps day offsets onto phrase tiers", () => {
    expect(describePlanWhen(0)).toEqual({ kind: "today" });
    expect(describePlanWhen(1)).toEqual({ kind: "tomorrow" });
    expect(describePlanWhen(2)).toEqual({ kind: "day-after" });
    expect(describePlanWhen(3)).toEqual({ kind: "days", count: 3 });
    expect(describePlanWhen(6)).toEqual({ kind: "days", count: 6 });
    expect(describePlanWhen(7)).toEqual({ kind: "weeks", count: 1 });
    expect(describePlanWhen(11)).toEqual({ kind: "weeks", count: 2 }); // round(11/7)
    expect(describePlanWhen(27)).toEqual({ kind: "weeks", count: 4 });
    expect(describePlanWhen(29)).toEqual({ kind: "weeks", count: 4 });
    expect(describePlanWhen(30)).toEqual({ kind: "months", count: 1 });
    expect(describePlanWhen(45)).toEqual({ kind: "months", count: 2 }); // round(45/30)
    expect(describePlanWhen(344)).toEqual({ kind: "months", count: 11 });
    expect(describePlanWhen(345)).toEqual({ kind: "years", count: 1 });
    expect(describePlanWhen(400)).toEqual({ kind: "years", count: 1 });
    expect(describePlanWhen(730)).toEqual({ kind: "years", count: 2 });
  });
});
