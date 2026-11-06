import { describe, expect, it } from "vitest";
import { buildMemoListTabQuery, combineFilters } from "@/hooks/useMemoListTab";

const NOW = 1793960636;

describe("buildMemoListTabQuery", () => {
  it("scopes unscheduled to NORMAL memos without plan time, newest edit first", () => {
    expect(buildMemoListTabQuery("unscheduled", NOW)).toEqual({
      filter: 'state == "NORMAL" && has_plan == false',
      orderBy: "pinned desc, update_time desc",
    });
  });

  it("scopes expired to overdue NORMAL memos, oldest deadline first", () => {
    expect(buildMemoListTabQuery("expired", NOW)).toEqual({
      filter: `state == "NORMAL" && plan_end_ts < ${NOW}`,
      orderBy: "pinned desc, plan_end_time asc",
    });
  });

  it("scopes planned to NORMAL memos whose deadline is still ahead", () => {
    expect(buildMemoListTabQuery("planned", NOW).filter).toBe(`state == "NORMAL" && plan_end_ts >= ${NOW}`);
  });

  it("switches the planned ordering basis", () => {
    expect(buildMemoListTabQuery("planned", NOW, "plan_start_time").orderBy).toBe("pinned desc, plan_start_time asc");
    expect(buildMemoListTabQuery("planned", NOW, "plan_end_time").orderBy).toBe("pinned desc, plan_end_time asc");
  });

  it("scopes completed to the COMPLETED state, most recently finished first", () => {
    expect(buildMemoListTabQuery("completed", NOW)).toEqual({
      filter: 'state == "COMPLETED"',
      orderBy: "pinned desc, completed_time desc",
    });
  });

  it("never leaves the state unscoped", () => {
    for (const tab of ["unscheduled", "expired", "planned", "completed"] as const) {
      expect(buildMemoListTabQuery(tab, NOW).filter).toContain("state ==");
    }
  });
});

describe("combineFilters", () => {
  it("returns undefined when there is nothing to combine", () => {
    expect(combineFilters()).toBeUndefined();
    expect(combineFilters("", "   ", undefined)).toBeUndefined();
  });

  it("keeps a single filter untouched", () => {
    expect(combineFilters('state == "NORMAL"')).toBe('state == "NORMAL"');
    expect(combineFilters('state == "NORMAL"', "", undefined)).toBe('state == "NORMAL"');
  });

  it("wraps every part in parentheses before joining", () => {
    expect(combineFilters('state == "NORMAL"', "pinned")).toBe('(state == "NORMAL") && (pinned)');
  });
});
