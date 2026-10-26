import { timestampDate } from "@bufbuild/protobuf/wkt";
import { CalendarDaysIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInstance } from "@/contexts/InstanceContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useScheduleCalendar } from "@/hooks/useScheduleCalendar";
import i18n from "@/i18n";
import {
  addDays,
  type CalendarView,
  calendarDays,
  calendarHeat,
  dateKey,
  groupScheduledMemos,
  moveCalendar,
} from "@/lib/schedule-calendar";
import { cn } from "@/lib/utils";
import Today from "@/pages/Today";
import { State } from "@/types/proto/api/v1/common_pb";
import { useTranslate } from "@/utils/i18n";

const HEAT_CLASSES = ["bg-muted/40", "bg-primary/10", "bg-primary/25", "bg-primary/45", "bg-primary/75 text-primary-foreground"];
type ScheduleView = "today" | CalendarView;

const Calendar = () => {
  const t = useTranslate();
  const user = useCurrentUser();
  const { generalSetting } = useInstance();
  const [params, setParams] = useSearchParams();
  const viewParam = params.get("view");
  const view: ScheduleView = viewParam === "month" || viewParam === "week" ? viewParam : "today";
  const calendarView: CalendarView = view === "today" ? "month" : view;
  const dateParam = params.get("date") || "";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T00:00:00`) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const weekStart = ((generalSetting.weekStartDayOffset % 7) + 7) % 7;
  const anchorKey = dateKey(anchor);
  const days = useMemo(
    () => calendarDays(new Date(`${anchorKey}T00:00:00`), calendarView, weekStart),
    [anchorKey, calendarView, weekStart],
  );
  const { data, isPending, isError, isFetching, error, refetch } = useScheduleCalendar(
    user?.name,
    days[0],
    addDays(days[days.length - 1], 1),
    view !== "today",
  );
  const groups = useMemo(() => groupScheduledMemos(data?.memos ?? [], days), [data, days]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const selectedMemos = selectedDate ? (groups.get(dateKey(selectedDate)) ?? []) : [];
  const locale = i18n.language;
  const longDate = (date: Date) => date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const today = dateKey(new Date());
  const title =
    calendarView === "month"
      ? anchor.toLocaleDateString(locale, { year: "numeric", month: "long" })
      : `${days[0].toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
  const changePeriod = (date: Date, nextView: CalendarView = calendarView) => {
    setSelectedDate(null);
    setParams({ view: nextView, date: dateKey(date) });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 py-4 md:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarDaysIcon className="size-5 text-primary" />
            {t("schedule.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("schedule.description")}</p>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="group" aria-label={t("schedule.view")}>
          {(["today", "month", "week"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={view === mode ? "secondary" : "ghost"}
              aria-pressed={view === mode}
              onClick={() => (mode === "today" ? setParams({ view: mode }) : changePeriod(anchor, mode))}
            >
              {t(`schedule.${mode}`)}
            </Button>
          ))}
        </div>
      </div>

      {view === "today" ? (
        <Today />
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border bg-card" aria-label={t("schedule.title")} aria-busy={isFetching}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 sm:p-4">
              <h2 className="text-base font-medium" aria-live="polite">
                {title}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("schedule.previous")}
                  onClick={() => changePeriod(moveCalendar(anchor, calendarView, -1))}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => changePeriod(new Date())}>
                  {t("common.today")}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("schedule.next")}
                  onClick={() => changePeriod(moveCalendar(anchor, calendarView, 1))}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
            {isError && (
              <div role="alert" className="space-y-2 border-b p-4 text-sm text-destructive">
                <p>{t("schedule.load-error")}</p>
                <p>{error.message}</p>
                <Button size="sm" variant="outline" onClick={() => void refetch()}>
                  {t("schedule.retry")}
                </Button>
              </div>
            )}
            {isPending && (
              <p className="px-4 pt-3 text-sm text-muted-foreground" role="status">
                {t("schedule.loading")}
              </p>
            )}
            <div className="p-2 sm:p-4">
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {days.slice(0, 7).map((day) => (
                  <span key={day.getDay()}>{day.toLocaleDateString(locale, { weekday: "short" })}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {days.map((day) => {
                  const key = dateKey(day);
                  const count = groups.get(key)?.length ?? 0;
                  const ready = !isPending && !isError;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!ready}
                      onClick={() => setSelectedDate(day)}
                      aria-label={`${longDate(day)}${ready ? `, ${t("schedule.count", { count })}` : ""}`}
                      aria-current={key === today ? "date" : undefined}
                      className={cn(
                        "flex min-w-0 flex-col items-start justify-between rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait sm:p-3",
                        calendarView === "month" ? "min-h-16 sm:min-h-24" : "min-h-24 sm:min-h-36",
                        HEAT_CLASSES[ready ? calendarHeat(count) : 0],
                        calendarView === "month" && day.getMonth() !== anchor.getMonth() && "opacity-45",
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
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
              <span>{t("schedule.rule")}</span>
              <div className="flex items-center gap-1.5">
                <span>{t("schedule.less")}</span>
                {HEAT_CLASSES.map((color, i) => (
                  <span key={color} title={["0", "1", "2–3", "4–6", "7+"][i]} className={cn("size-3 rounded-sm", color)} />
                ))}
                <span>{t("schedule.more")}</span>
              </div>
            </div>
          </section>
          <Dialog
            open={!!selectedDate}
            onOpenChange={(open) => {
              if (!open) setSelectedDate(null);
            }}
          >
            <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{selectedDate && longDate(selectedDate)}</DialogTitle>
                <DialogDescription>{t("schedule.count", { count: selectedMemos.length })}</DialogDescription>
              </DialogHeader>
              {selectedMemos.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("schedule.empty")}</p>
              ) : (
                <ul className="space-y-2">
                  {selectedMemos.map((memo) => (
                    <li key={memo.name}>
                      <Link
                        to={`/${memo.name}`}
                        state={{ from: `/calendar?${params}` }}
                        className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                            memo.state === State.COMPLETED && "border-primary bg-primary/10 text-primary",
                          )}
                        >
                          {memo.state === State.COMPLETED && <CheckIcon className="size-3" />}
                          <span className="sr-only">{memo.state === State.COMPLETED ? t("common.completed") : t("schedule.planned")}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm font-medium">
                            {memo.content.trim() || t("schedule.untitled")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {timestampDate(memo.planStartTime!).toLocaleString(locale, {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {timestampDate(memo.planEndTime!).toLocaleString(locale, {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Calendar;
