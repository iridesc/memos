import i18n from "@/i18n";
import { calendarHeat, dateKey, formatLongDate } from "@/lib/schedule-calendar";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

const HEAT_CLASSES = ["bg-muted/40", "bg-primary/10", "bg-primary/25", "bg-primary/45", "bg-primary/75 text-primary-foreground"];

interface Props {
  /** Days to render; the first seven drive the weekday header. */
  days: Date[];
  /** Memos grouped by local date key. */
  groups: Map<string, Memo[]>;
  onSelectDay: (day: Date) => void;
  /** When set, days outside this month are dimmed (month grid only). */
  anchorMonth?: number;
  /** False while the counts are still loading. */
  ready: boolean;
}

/**
 * Day grid shared by the week and month schedule views.
 *
 * Each cell shows the day number plus the number of memos planned for that
 * day, tinted by workload. Clicking a cell opens the day's item list.
 */
const ScheduleDayGrid = ({ days, groups, onSelectDay, anchorMonth, ready }: Props) => {
  const t = useTranslate();
  const locale = i18n.language;
  const today = dateKey(new Date());

  return (
    <>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {days.slice(0, 7).map((day) => (
          <span key={day.getDay()}>{day.toLocaleDateString(locale, { weekday: "short" })}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day) => {
          const key = dateKey(day);
          const count = groups.get(key)?.length ?? 0;
          return (
            <button
              key={key}
              type="button"
              disabled={!ready}
              onClick={() => onSelectDay(day)}
              aria-label={`${formatLongDate(day, locale)}${ready ? `, ${t("schedule.count", { count })}` : ""}`}
              aria-current={key === today ? "date" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-start justify-between rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait sm:p-3",
                "min-h-16 sm:min-h-24",
                HEAT_CLASSES[ready ? calendarHeat(count) : 0],
                anchorMonth !== undefined && day.getMonth() !== anchorMonth && "opacity-45",
                key === today && "border-primary",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs sm:text-sm",
                  key === today && "bg-primary text-primary-foreground",
                )}
              >
                {day.getDate()}
              </span>
              <span className="w-full truncate text-center text-xs tabular-nums sm:text-sm">
                {ready ? count : "—"}
                <span className="hidden sm:inline"> {ready && t("schedule.items")}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default ScheduleDayGrid;
