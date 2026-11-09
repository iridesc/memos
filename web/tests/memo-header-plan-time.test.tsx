import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemoHeader from "@/components/MemoView/components/MemoHeader";
import { MemoViewContext, type MemoViewContextValue } from "@/components/MemoView/MemoViewContext";
import { State } from "@/types/proto/api/v1/common_pb";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const dict: Record<string, string> = {
  "common.archived": "已归档",
  "common.completed": "已完成",
  "common.plan-time.expired": "已过期",
  "common.plan-time.expired-days": "已逾期{{count}}天",
  "common.plan-time.expired-absolute": "已过期 · {{range}}",
  "common.plan-time.in-progress": "进行中 · {{time}}后结束",
  "common.plan-time.in-progress-absolute": "进行中 · {{range}}",
  "common.plan-time.not-started": "{{when}} · 持续{{duration}}",
  "common.plan-time.starts-imminent": "即将开始 · 持续{{duration}}",
  "common.plan-time.ends-imminent": "进行中 · 即将结束",
  "common.plan-time.when-hours": "{{time}}后",
  "common.plan-time.when-tomorrow": "明天",
  "common.plan-time.when-day-after": "后天",
  "common.plan-time.when-days": "{{count}}天后",
  "common.plan-time.when-weeks": "{{count}}周后",
  "common.plan-time.when-months": "{{count}}月后",
  "common.plan-time.when-years": "{{count}}年后",
  "common.plan-time.unit-day": "{{count}}天",
  "common.plan-time.unit-hour": "{{count}}小时",
  "common.plan-time.unit-minute": "{{count}}分钟",
  "common.plan-time.unit-month": "{{count}}月",
};

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string, values?: Record<string, unknown>) => {
    let text = dict[key] ?? key;
    for (const [name, value] of Object.entries(values ?? {})) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
    return text;
  },
}));

vi.mock("@/i18n", () => ({ default: { language: "zh-Hans" } }));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useMemoQueries", () => ({
  useUpdateMemo: () => ({ mutateAsync: vi.fn() }),
  useDeleteMemo: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({ generalSetting: {}, user: undefined, tagsSetting: {}, profile: { instanceUrl: "" } }),
}));

vi.mock("@/hooks/useCurrentUser", () => ({ default: () => undefined }));

const PLAN_START = new Date(2026, 10, 4, 9, 0, 0);
const PLAN_END = new Date(2026, 10, 4, 14, 0, 0);

// Fixed clock: the plan time is in the past, so the memo renders as expired.
const NOW = new Date(2026, 10, 4, 15, 0, 0);

const buildContext = (): MemoViewContextValue => ({
  memo: create(MemoSchema, {
    name: "memos/abc",
    content: "hello",
    state: State.NORMAL,
    planStartTime: timestampFromDate(PLAN_START),
    planEndTime: timestampFromDate(PLAN_END),
  }),
  creator: undefined,
  currentUser: undefined,
  parentPage: "/",
  cardWidth: 0,
  isArchived: false,
  readonly: true,
  showBlurredContent: false,
  blurred: false,
  openEditor: vi.fn(),
  toggleBlurVisibility: vi.fn(),
  openPreview: vi.fn(),
});

const renderHeader = (compact: boolean | undefined) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/memos/abc"]}>
        <MemoViewContext.Provider value={buildContext()}>
          <MemoHeader showCreator={false} showVisibility={false} showPinned={false} compact={compact} />
        </MemoViewContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("MemoHeader plan time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the relative phrasing in compact lists", () => {
    renderHeader(true);

    expect(screen.getByText("已过期")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /09:00/ })).not.toBeInTheDocument();
  });

  it("shows the absolute range on detail pages", () => {
    renderHeader(false);

    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /已过期/ });
    expect(button.textContent).toContain("09:00");
    expect(button.textContent).toContain("14:00");
  });
});
