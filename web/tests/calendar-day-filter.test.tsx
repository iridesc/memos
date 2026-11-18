import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Calendar from "@/pages/Calendar";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const state = vi.hoisted(() => ({ memos: [] as unknown[] }));

vi.mock("@/i18n", () => ({ default: { language: "en-US" } }));

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string, values?: Record<string, unknown>) => {
    const dict: Record<string, string> = {
      "schedule.count": "{{count}} items",
      "schedule.items": "items",
      "schedule.empty": "Nothing planned",
      "schedule.untitled": "Untitled",
      "schedule.planned": "Planned",
      "schedule.title": "Schedule",
      "schedule.view": "View",
      "schedule.today": "Today",
      "schedule.week": "Week",
      "schedule.past": "Past",
      "schedule.past-empty": "Nothing overdue",
      "schedule.month": "Month",
      "schedule.previous": "Previous",
      "schedule.next": "Next",
      "schedule.rule": "By plan dates",
      "schedule.less": "Less",
      "schedule.more": "More",
      "schedule.loading": "Loading",
      "schedule.load-error": "Failed to load",
      "schedule.retry": "Retry",
      "schedule.all-items": "All items",
      "schedule.clear-filter": "Clear filter",
      "schedule.day-empty": "Nothing planned for this day.",
      "schedule.period-empty": "Nothing planned for this period.",
      "schedule.week-heading": "Week {{index}} of {{month}}",
      "common.completed": "Completed",
      "common.today": "Today",
    };
    let text = dict[key] ?? key;
    for (const [name, value] of Object.entries(values ?? {})) {
      text = text.replace(`{{${name}}}`, String(value));
    }
    return text;
  },
}));

vi.mock("@/hooks/useCurrentUser", () => ({ default: () => ({ name: "users/1" }) }));

vi.mock("@/hooks/useScheduleCalendar", () => ({
  useScheduleCalendar: () => ({
    data: { memos: state.memos },
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useHasExpiredMemos: () => ({ data: false }),
}));

vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({
    generalSetting: { weekStartDayOffset: 0 },
    tagsSetting: { tags: {} },
  }),
}));

vi.mock("@/pages/Today", () => ({ default: () => null }));

// The list card pulls in the editor and the markdown renderer; the calendar
// only needs to know which day the list is filtered to.
vi.mock("@/components/ScheduleCalendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ScheduleCalendar")>();
  return {
    ...actual,
    SchedulePeriodList: ({ selectedDayKey }: { selectedDayKey: string | null }) => (
      <div data-testid="period-list">{selectedDayKey ?? "all"}</div>
    ),
  };
});

const renderCalendar = (view: "week" | "month" = "week") => {
  const router = createMemoryRouter(
    [
      { path: "/calendar", element: <Calendar /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: [`/calendar?view=${view}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const todayLabel = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

const plannedMemo = (content: string) => {
  const now = new Date();
  return create(MemoSchema, {
    name: "memos/planned",
    content,
    planStartTime: timestampFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)),
    planEndTime: timestampFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)),
  });
};

describe("calendar day filter", () => {
  beforeEach(() => {
    state.memos = [];
  });

  it("filters the list to the clicked day and clears the filter on a second click", () => {
    state.memos = [plannedMemo("today task")];
    renderCalendar();

    const cell = screen.getByRole("button", { name: `${todayLabel()}, 1 items` });
    expect(screen.getByTestId("period-list")).toHaveTextContent("all");

    fireEvent.click(cell);
    expect(screen.getByTestId("period-list")).not.toHaveTextContent("all");
    expect(cell).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(cell);
    expect(screen.getByTestId("period-list")).toHaveTextContent("all");
    expect(cell).toHaveAttribute("aria-pressed", "false");
  });

  it("clears the filter when the period changes", () => {
    state.memos = [plannedMemo("today task")];
    renderCalendar();

    fireEvent.click(screen.getByRole("button", { name: `${todayLabel()}, 1 items` }));
    expect(screen.getByTestId("period-list")).not.toHaveTextContent("all");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("period-list")).toHaveTextContent("all");
  });
});
