import { describe, expect, it } from "vitest";
import { createQuickPlanTimeRange } from "@/lib/plan-time";

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
