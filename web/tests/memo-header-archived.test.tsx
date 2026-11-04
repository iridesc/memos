import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanTimeDisplay } from "@/components/MemoView/components/MemoHeader";

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

const HOUR = 60 * 60 * 1000;

// Fixed clock: 2026-11-04 15:00 local. The rendered phrasing is calendar-day
// sensitive, so a real clock would make these assertions flaky around midnight.
const NOW = new Date(2026, 10, 4, 15, 0, 0);
const at = (dayOffset: number, hour: number, minute = 0) => new Date(2026, 10, 4 + dayOffset, hour, minute, 0, 0);
const dayEnd = (dayOffset: number) => new Date(2026, 10, 4 + dayOffset, 23, 59, 59, 999);

const renderPlanTime = (props: {
  compact?: boolean;
  isArchived?: boolean;
  isCompleted?: boolean;
  start: Date;
  end: Date;
  updateTime?: Date;
}) =>
  render(
    <PlanTimeDisplay
      planStartTime={props.start}
      planEndTime={props.end}
      updateTime={props.updateTime}
      isCompleted={props.isCompleted}
      isArchived={props.isArchived}
      compact={props.compact}
      timeTooltip={{}}
      onGotoDetail={() => {}}
    />,
  );

describe("PlanTimeDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the expired label for an active memo whose plan time has passed", () => {
    renderPlanTime({ start: at(0, 9), end: at(0, 14) });

    expect(screen.getByText("已过期")).toBeInTheDocument();
  });

  it("hides the expired label for an archived memo", () => {
    renderPlanTime({ isArchived: true, start: at(0, 9), end: at(0, 14) });

    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
    expect(screen.getByText("已归档")).toBeInTheDocument();
  });

  it("shows the archive date next to the archived label", () => {
    const updateTime = new Date("2026-11-03T10:00:00Z");
    renderPlanTime({ isArchived: true, updateTime, start: at(0, 9), end: at(0, 14) });

    expect(screen.getByText("已归档")).toBeInTheDocument();
    expect(screen.getByText(updateTime.toLocaleDateString("zh-Hans", { month: "numeric", day: "numeric" }))).toBeInTheDocument();
  });

  it("does not show the archived label for an archived memo without plan times", () => {
    render(<PlanTimeDisplay isArchived timeTooltip={{}} onGotoDetail={() => {}} />);

    expect(screen.queryByText("已归档")).not.toBeInTheDocument();
    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
  });

  it("keeps the completed label for a completed memo", () => {
    renderPlanTime({ isCompleted: true, updateTime: new Date("2026-11-03T10:00:00Z"), start: at(0, 9), end: at(0, 14) });

    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.queryByText("已归档")).not.toBeInTheDocument();
    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
  });
});

describe("PlanTimeDisplay calendar-day phrasing (compact lists)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders 明天 for a plan starting tomorrow, regardless of the hour distance", () => {
    renderPlanTime({ start: at(1, 9), end: dayEnd(1) });
    expect(screen.getByText("明天 · 持续15小时")).toBeInTheDocument();
  });

  it("renders 后天 for a plan starting the day after tomorrow", () => {
    renderPlanTime({ start: at(2, 9), end: dayEnd(2) });
    expect(screen.getByText("后天 · 持续15小时")).toBeInTheDocument();
  });

  it("keeps the hour granularity for a plan later today", () => {
    renderPlanTime({ start: at(0, 18), end: dayEnd(0) });
    expect(screen.getByText("3小时后 · 持续6小时")).toBeInTheDocument();
  });

  it("renders the day count within the same week, then whole weeks", () => {
    renderPlanTime({ start: at(4, 9), end: dayEnd(4) });
    expect(screen.getByText("4天后 · 持续15小时")).toBeInTheDocument();
  });

  it("rounds 11 days to 2 weeks", () => {
    renderPlanTime({ start: at(11, 9), end: dayEnd(11) });
    expect(screen.getByText("2周后 · 持续15小时")).toBeInTheDocument();
  });

  it("rounds 45 days to 2 months", () => {
    renderPlanTime({ start: at(45, 9), end: dayEnd(45) });
    expect(screen.getByText("2月后 · 持续15小时")).toBeInTheDocument();
  });

  it("reports how many days an expired plan is overdue", () => {
    renderPlanTime({ start: at(-1, 9), end: at(-1, 14) });
    expect(screen.getByText("已逾期1天")).toBeInTheDocument();
  });

  it("reports several overdue days", () => {
    renderPlanTime({ start: at(-3, 9), end: at(-3, 14) });
    expect(screen.getByText("已逾期3天")).toBeInTheDocument();
  });
});

describe("PlanTimeDisplay absolute range (detail pages)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const buttonText = () => screen.getAllByRole("button", { name: /–/ }).at(-1)?.textContent ?? "";

  it("shows the absolute range for a future plan instead of the relative phrase", () => {
    renderPlanTime({ compact: false, start: at(1, 9), end: at(1, 18) });
    expect(buttonText()).not.toContain("明天");
    expect(buttonText()).toContain("09:00");
    expect(buttonText()).toContain("18:00");
  });

  it("prefixes the in-progress state for detail pages", () => {
    renderPlanTime({ compact: false, start: at(0, 9), end: at(0, 18) });
    expect(buttonText()).toContain("进行中");
  });

  it("prefixes the expired state for detail pages", () => {
    renderPlanTime({ compact: false, start: at(-1, 9), end: at(-1, 14) });
    expect(buttonText()).toContain("已过期");
  });

  it("shows one date for same-day plans", () => {
    renderPlanTime({ compact: false, start: at(1, 9), end: at(1, 18) });
    expect((buttonText().match(/11\/5/g) ?? []).length).toBe(1);
  });

  it("shows two dates for cross-day plans", () => {
    renderPlanTime({ compact: false, start: at(1, 9), end: at(3, 18) });
    expect(buttonText()).toMatch(/11\/5.*11\/7/);
  });
});
