import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { addDays, calendarDays, calendarHeat, calendarWeekDays, dateKey, groupScheduledMemos, moveCalendar, moveWeek, stripTagsFromPreview } from "@/lib/schedule-calendar";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const date = (value: string) => new Date(`${value}T00:00:00`);
const memo = (name: string, start: string, end: string) =>
  create(MemoSchema, { name, planStartTime: timestampFromDate(new Date(start)), planEndTime: timestampFromDate(new Date(end)) });

describe("schedule calendar dates", () => {
  it("includes leap day and pads complete weeks with the configured first weekday", () => {
    const days = calendarDays(date("2024-02-20"), 1);
    expect(dateKey(days[0])).toBe("2024-01-29");
    expect(dateKey(days.at(-1)!)).toBe("2024-03-03");
    expect(days.some((day) => dateKey(day) === "2024-02-29")).toBe(true);
    expect(days.length % 7).toBe(0);
  });
  it("moves months without skipping February from the 31st", () => {
    expect(dateKey(moveCalendar(date("2026-01-31"), 1))).toBe("2026-02-01");
    expect(dateKey(moveCalendar(date("2026-01-01"), -1))).toBe("2025-12-01");
  });
  it("steps through local dates across DST changes", () => {
    expect(dateKey(addDays(date("2026-03-08"), 1))).toBe("2026-03-09");
    expect(addDays(date("2026-11-01"), 1).getHours()).toBe(0);
  });
  it("builds the seven days of the week containing the anchor date", () => {
    const days = calendarWeekDays(date("2026-11-09"), 0);
    expect(days.map((day) => dateKey(day))).toEqual(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
  });
  it("honours the configured first weekday of the week", () => {
    const days = calendarWeekDays(date("2026-11-09"), 1);
    expect(dateKey(days[0])).toBe("2026-11-09");
    expect(dateKey(days.at(-1)!)).toBe("2026-11-15");
  });
  it("moves a week forward and backward by seven days", () => {
    expect(dateKey(moveWeek(date("2026-11-09"), 1))).toBe("2026-11-16");
    expect(dateKey(moveWeek(date("2026-11-09"), -1))).toBe("2026-11-02");
  });
});

describe("scheduled day counts", () => {
  it("includes every planned date and the deadline date exactly once", () => {
    const event = memo("cross-day", "2026-10-24T20:00:00", "2026-10-26T00:00:00");
    const days = Array.from({ length: 4 }, (_, i) => addDays(date("2026-10-24"), i));
    const grouped = groupScheduledMemos([event, event, create(MemoSchema, { name: "unscheduled" })], days);
    expect(days.map((day) => grouped.get(dateKey(day))?.length)).toEqual([1, 1, 1, 0]);
  });
  it("ignores invalid intervals and sorts the day list by plan start", () => {
    const days = [date("2026-10-25")];
    const grouped = groupScheduledMemos(
      [
        memo("late", "2026-10-25T15:00:00", "2026-10-25T16:00:00"),
        memo("invalid", "2026-10-25T18:00:00", "2026-10-25T17:00:00"),
        memo("early", "2026-10-25T09:00:00", "2026-10-25T10:00:00"),
      ],
      days,
    );
    expect(grouped.get("2026-10-25")?.map((item) => item.name)).toEqual(["early", "late"]);
  });
  it("uses stable workload bands", () => {
    expect([0, 1, 2, 3, 4, 6, 7, 100].map(calendarHeat)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("stripTagsFromPreview", () => {
  it("removes leading tag lines and keeps the body", () => {
    expect(stripTagsFromPreview("#项目/memodo\n\n整理标签渲染\n", ["项目/memodo"])).toBe("整理标签渲染");
  });
  it("leaves content untouched when the memo has no tags", () => {
    expect(stripTagsFromPreview("正文 #123\n", [])).toBe("正文 #123");
  });
  it("does not strip unknown tag-like tokens", () => {
    expect(stripTagsFromPreview("#项目/memodo 讨论 #123 的问题", ["项目/memodo"])).toBe(" 讨论 #123 的问题".trim());
  });
  it("strips the longest tag first so prefixes are not left behind", () => {
    expect(stripTagsFromPreview("#项目 #项目/memodo\n正文\n", ["项目", "项目/memodo"])).toBe("正文");
  });
  it("collapses the blank lines left behind", () => {
    expect(stripTagsFromPreview("#工作/周会\n\n\n#项目/memodo\n\n正文\n", ["工作/周会", "项目/memodo"])).toBe("正文");
  });
});
