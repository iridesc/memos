import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanTimeDisplay } from "@/components/MemoView/components/MemoHeader";

vi.mock("@/utils/i18n", () => ({
  useTranslate: () => (key: string) =>
    ({
      "common.archived": "已归档",
      "common.completed": "已完成",
      "common.plan-time.expired": "已过期",
      "common.plan-time.in-progress": "进行中 · {{time}}后结束",
      "common.plan-time.not-started": "{{time}}后开始 · 持续{{duration}}",
      "common.plan-time.unit-day": "{{count}}天",
      "common.plan-time.unit-hour": "{{count}}小时",
      "common.plan-time.unit-minute": "{{count}}分钟",
      "common.plan-time.unit-month": "{{count}}月",
    })[key] ?? key,
}));

vi.mock("@/i18n", () => ({ default: { language: "zh-Hans" } }));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const HOUR = 60 * 60 * 1000;

const renderPlanTime = (props: {
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
      timeTooltip={{}}
      onGotoDetail={() => {}}
    />,
  );

describe("PlanTimeDisplay", () => {
  it("shows the expired label for an active memo whose plan time has passed", () => {
    renderPlanTime({
      start: new Date(Date.now() - 5 * HOUR),
      end: new Date(Date.now() - 1 * HOUR),
    });

    expect(screen.getByText("已过期")).toBeInTheDocument();
  });

  it("hides the expired label for an archived memo", () => {
    renderPlanTime({
      isArchived: true,
      start: new Date(Date.now() - 5 * HOUR),
      end: new Date(Date.now() - 1 * HOUR),
    });

    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
    expect(screen.getByText("已归档")).toBeInTheDocument();
  });

  it("shows the archive date next to the archived label", () => {
    const updateTime = new Date("2026-11-03T10:00:00Z");
    renderPlanTime({
      isArchived: true,
      updateTime,
      start: new Date(Date.now() - 5 * HOUR),
      end: new Date(Date.now() - 1 * HOUR),
    });

    expect(screen.getByText("已归档")).toBeInTheDocument();
    expect(screen.getByText(updateTime.toLocaleDateString("zh-Hans", { month: "numeric", day: "numeric" }))).toBeInTheDocument();
  });

  it("does not show the archived label for an archived memo without plan times", () => {
    render(
      <PlanTimeDisplay isArchived timeTooltip={{}} onGotoDetail={() => {}} />,
    );

    expect(screen.queryByText("已归档")).not.toBeInTheDocument();
    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
  });

  it("keeps the completed label for a completed memo", () => {
    renderPlanTime({
      isCompleted: true,
      updateTime: new Date("2026-11-03T10:00:00Z"),
      start: new Date(Date.now() - 5 * HOUR),
      end: new Date(Date.now() - 1 * HOUR),
    });

    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(screen.queryByText("已归档")).not.toBeInTheDocument();
    expect(screen.queryByText("已过期")).not.toBeInTheDocument();
  });
});
