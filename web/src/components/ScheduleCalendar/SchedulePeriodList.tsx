import { useMemo } from "react";
import MemoView from "@/components/MemoView";
import i18n from "@/i18n";
import { dateKey, formatDayHeading, formatMonthLabel, groupScheduledMemos } from "@/lib/schedule-calendar";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  /** Every memo planned inside the displayed period. */
  memos: Memo[];
  /** Days covered by the period; the week view passes seven, the month view the whole grid. */
  days: Date[];
  /** Week lists one section per day, month lists one section per week. */
  mode: "week" | "month";
  /** Month the grid belongs to; days outside it are dimmed in the month view. */
  anchorMonth?: number;
  /** When set, only this day is listed. */
  selectedDayKey: string | null;
}

const DaySection = ({ day, items }: { day: Date; items: Memo[] }) => {
  const t = useTranslate();
  return (
    <section className="space-y-2">
      <h5 className="flex flex-wrap items-baseline gap-2 text-sm font-medium">
        <span>{formatDayHeading(day, i18n.language)}</span>
        <span className="text-xs font-normal text-muted-foreground">{t("schedule.count", { count: items.length })}</span>
      </h5>
      {items.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">{t("schedule.day-empty")}</p>
      ) : (
        <div className="space-y-2">
          {items.map((memo) => (
            <MemoView key={memo.name} memo={memo} showVisibility showPinned compact />
          ))}
        </div>
      )}
    </section>
  );
};

/**
 * Lists every memo planned in the displayed period.
 *
 * The week view groups the items by day; the month view groups them by week
 * and keeps the day headings inside. Selecting a day in the grid above narrows
 * the list down to that single day.
 */
const SchedulePeriodList = ({ memos, days, mode, anchorMonth, selectedDayKey }: Props) => {
  const t = useTranslate();
  const locale = i18n.language;
  const groups = useMemo(() => groupScheduledMemos(memos, days), [memos, days]);

  if (selectedDayKey) {
    const day = days.find((item) => dateKey(item) === selectedDayKey);
    if (!day) return null;
    return <DaySection day={day} items={groups.get(selectedDayKey) ?? []} />;
  }

  if (mode === "week") {
    const sections = days.map((day) => ({ day, items: groups.get(dateKey(day)) ?? [] })).filter((section) => section.items.length > 0);
    if (sections.length === 0) {
      return <p className="py-6 text-center text-sm text-muted-foreground">{t("schedule.period-empty")}</p>;
    }
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {sections.map((section) => (
          <DaySection key={dateKey(section.day)} day={section.day} items={section.items} />
        ))}
      </div>
    );
  }

  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
  const monthLabel = days.length > 0 ? formatMonthLabel(days[0], locale) : "";
  const sections = weeks
    .map((week, index) => {
      const weekItems = week.flatMap((day) => groups.get(dateKey(day)) ?? []);
      const visibleDays = week.filter((day) => day.getMonth() === anchorMonth && (groups.get(dateKey(day))?.length ?? 0) > 0);
      return { index, weekItems, visibleDays };
    })
    .filter((section) => section.visibleDays.length > 0);
  if (sections.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("schedule.period-empty")}</p>;
  }
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {sections.map((section) => (
        <section key={section.index} className="space-y-4">
          <h4 className="text-sm font-medium">
            {t("schedule.week-heading", { month: monthLabel, index: section.index + 1 })}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {t("schedule.count", { count: section.weekItems.length })}
            </span>
          </h4>
          {section.visibleDays.map((day) => (
            <DaySection key={dateKey(day)} day={day} items={groups.get(dateKey(day)) ?? []} />
          ))}
        </section>
      ))}
    </div>
  );
};

export default SchedulePeriodList;
