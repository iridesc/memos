import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanTimeEditor } from "@/components/MemoEditor/components/EditorToolbar";

// The toolbar popover offers three relative presets, a "tomorrow" preset and
// two day pickers (this week / this month). Picking a day must hand back a
// plan window that starts at 09:00 on that day.
const NOW = new Date(2026, 10, 4, 15, 0, 0); // Wednesday
const THURSDAY = new Date(2026, 10, 5); // still in the same week, in the future

describe("plan time pickers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const openPopover = (onChange: (times: { planStartTime?: Date; planEndTime?: Date }) => void) => {
    const { container } = render(<PlanTimeEditor onChange={onChange} />);
    fireEvent.click(container.querySelector("button")!);
  };

  it("keeps the three relative presets and the three calendar entries", () => {
    openPopover(vi.fn());

    expect(screen.getByRole("button", { name: "In 15 minutes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In 1 hour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In 3 hours" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tomorrow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This week" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This month" })).toBeInTheDocument();
  });

  it("plans the picked week day from 09:00 to the end of that day", () => {
    const onChange = vi.fn();
    openPopover(onChange);
    fireEvent.click(screen.getByRole("button", { name: "This week" }));

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${THURSDAY.getDate()}$`) }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const { planStartTime, planEndTime } = onChange.mock.calls[0][0];
    expect(planStartTime).toEqual(new Date(2026, 10, 5, 9, 0, 0, 0));
    expect(planEndTime).toEqual(new Date(2026, 10, 5, 23, 59, 59, 999));
  });

  it("plans the picked month day from 09:00 to the end of that day", () => {
    const onChange = vi.fn();
    openPopover(onChange);
    fireEvent.click(screen.getByRole("button", { name: "This month" }));

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${THURSDAY.getDate()}$`) }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const { planStartTime, planEndTime } = onChange.mock.calls[0][0];
    expect(planStartTime).toEqual(new Date(2026, 10, 5, 9, 0, 0, 0));
    expect(planEndTime).toEqual(new Date(2026, 10, 5, 23, 59, 59, 999));
  });
});
