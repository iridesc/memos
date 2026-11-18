import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SchedulePeriodList from "@/components/ScheduleCalendar/SchedulePeriodList";
import { addDays, dateKey } from "@/lib/schedule-calendar";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

vi.mock("@/i18n", () => ({ default: { language: "en-US" } }));

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string, values?: Record<string, unknown>) => {
    const dict: Record<string, string> = {
      "schedule.count": "{{count}} items",
      "schedule.day-empty": "Nothing planned for this day.",
      "schedule.period-empty": "Nothing planned for this period.",
      "schedule.week-heading": "Week {{index}} of {{month}}",
    };
    let text = dict[key] ?? key;
    for (const [name, value] of Object.entries(values ?? {})) {
      text = text.replace(`{{${name}}}`, String(value));
    }
    return text;
  },
}));

// The memo card pulls in the editor, the user cache and the markdown renderer.
// The list only needs to know which memos it renders and in which order.
vi.mock("@/components/MemoView", () => ({
  default: ({ memo }: { memo: { name: string; content: string } }) => <div data-testid="memo">{memo.content}</div>,
}));

const day = (value: string) => new Date(`${value}T00:00:00`);

const plannedMemo = (name: string, content: string, start: string, end: string) =>
  create(MemoSchema, {
    name,
    content,
    planStartTime: timestampFromDate(new Date(start)),
    planEndTime: timestampFromDate(new Date(end)),
  });

const weekDays = [day("2026-11-09"), day("2026-11-10"), day("2026-11-11"), day("2026-11-12"), day("2026-11-13"), day("2026-11-14"), day("2026-11-15")];

const dayHeading = (date: Date) => `${date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })} ${date.toLocaleDateString("en-US", { weekday: "short" })}`;

describe("schedule period list", () => {
  it("groups the week view by day", () => {
    const memos = [
      plannedMemo("memos/a", "monday task", "2026-11-09T09:00:00", "2026-11-09T10:00:00"),
      plannedMemo("memos/b", "wednesday task", "2026-11-11T09:00:00", "2026-11-11T10:00:00"),
    ];

    render(<SchedulePeriodList memos={memos} days={weekDays} mode="week" selectedDayKey={null} />);

    expect(screen.getByText(dayHeading(weekDays[0]))).toBeInTheDocument();
    expect(screen.getByText(dayHeading(weekDays[2]))).toBeInTheDocument();
    expect(screen.getByText("monday task")).toBeInTheDocument();
    expect(screen.getByText("wednesday task")).toBeInTheDocument();
    // Days without items are not listed.
    expect(screen.queryByText(dayHeading(weekDays[1]))).not.toBeInTheDocument();
  });

  it("groups the month view by week", () => {
    const days = Array.from({ length: 28 }, (_, index) => addDays(day("2026-11-01"), index));
    const memos = [plannedMemo("memos/a", "first week task", "2026-11-02T09:00:00", "2026-11-02T10:00:00")];

    render(<SchedulePeriodList memos={memos} days={days} mode="month" anchorMonth={10} selectedDayKey={null} />);

    expect(screen.getByText(/Week 1 of November/)).toBeInTheDocument();
    expect(screen.getByText("first week task")).toBeInTheDocument();
  });

  it("shows only the selected day", () => {
    const memos = [
      plannedMemo("memos/a", "monday task", "2026-11-09T09:00:00", "2026-11-09T10:00:00"),
      plannedMemo("memos/b", "wednesday task", "2026-11-11T09:00:00", "2026-11-11T10:00:00"),
    ];

    render(<SchedulePeriodList memos={memos} days={weekDays} mode="week" selectedDayKey={dateKey(weekDays[2])} />);

    expect(screen.getByText("wednesday task")).toBeInTheDocument();
    expect(screen.queryByText("monday task")).not.toBeInTheDocument();
  });

  it("reports an empty period", () => {
    render(<SchedulePeriodList memos={[]} days={weekDays} mode="week" selectedDayKey={null} />);

    expect(screen.getByText("Nothing planned for this period.")).toBeInTheDocument();
  });
});
