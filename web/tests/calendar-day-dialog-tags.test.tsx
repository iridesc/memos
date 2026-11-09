import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Calendar from "@/pages/Calendar";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

// `useScheduleCalendar` is mocked module-level, so the memo payload has to live in a
// hoisted container that each test can fill in after the schemas are imported.
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
      "schedule.description": "Plans for the selected period",
      "schedule.view": "View",
      "schedule.today": "Today",
      "schedule.week": "Week",
      "schedule.past": "Past",
      "schedule.past-empty": "Nothing overdue",
      "schedule.month": "Month",
      "schedule.previous": "Previous",
      "schedule.next": "Next",
      "schedule.rule": "Each day counts memos whose plan window touches it",
      "schedule.less": "Less",
      "schedule.more": "More",
      "schedule.loading": "Loading",
      "schedule.load-error": "Failed to load",
      "schedule.retry": "Retry",
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

const renderCalendar = () => {
  const router = createMemoryRouter(
    [
      { path: "/calendar", element: <Calendar /> },
      { path: "/", element: <div data-testid="home" /> },
    ],
    { initialEntries: ["/calendar?view=month"] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const todayLabel = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

const plannedMemo = (content: string, tags: string[]) => {
  const now = new Date();
  return create(MemoSchema, {
    name: "memos/planned",
    content,
    tags,
    planStartTime: timestampFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0)),
    planEndTime: timestampFromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)),
  });
};

describe("calendar day dialog tags", () => {
  beforeEach(() => {
    state.memos = [];
  });

  it("renders tags as chips and keeps them out of the text preview", () => {
    state.memos = [plannedMemo("#项目/memodo\n\n整理标签渲染\n", ["项目/memodo"])];
    renderCalendar();

    fireEvent.click(screen.getByRole("button", { name: `${todayLabel()}, 1 items` }));

    expect(screen.getByText("#项目/memodo")).toBeInTheDocument();
    expect(screen.getByText("整理标签渲染")).toBeInTheDocument();
    expect(screen.getByText("整理标签渲染")).not.toHaveTextContent("#项目/memodo");
  });

  it("renders every tag of a memo with multiple tags", () => {
    state.memos = [plannedMemo("#工作/周会 #项目/memodo\n\n同步进度\n", ["工作/周会", "项目/memodo"])];
    renderCalendar();

    fireEvent.click(screen.getByRole("button", { name: `${todayLabel()}, 1 items` }));

    expect(screen.getByText("#工作/周会")).toBeInTheDocument();
    expect(screen.getByText("#项目/memodo")).toBeInTheDocument();
    expect(screen.getByText("同步进度")).toBeInTheDocument();
  });

  it("filters the memo list when a tag chip is clicked", async () => {
    state.memos = [plannedMemo("#项目/memodo\n\n整理标签渲染\n", ["项目/memodo"])];
    const router = renderCalendar();

    fireEvent.click(screen.getByRole("button", { name: `${todayLabel()}, 1 items` }));
    fireEvent.click(screen.getByRole("button", { name: "#项目/memodo" }));

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toContain("tagSearch");
    expect(decodeURIComponent(router.state.location.search)).toContain("项目/memodo");
  });
});
