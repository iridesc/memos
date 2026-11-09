import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { ScheduleDayDialog, ScheduleDayGrid } from "@/components/ScheduleCalendar";
import { Button } from "@/components/ui/button";
import { useInstance } from "@/contexts/InstanceContext";
import { stringifyFilters } from "@/contexts/MemoFilterContext";
import { buildMemoCreatorFilter } from "@/helpers/resource-names";
import useCurrentUser from "@/hooks/useCurrentUser";
import useNavigateTo from "@/hooks/useNavigateTo";
import { useHasExpiredMemos, useScheduleCalendar } from "@/hooks/useScheduleCalendar";
import i18n from "@/i18n";
import { addDays, calendarDays, calendarWeekDays, dateKey, groupScheduledMemos, moveCalendar, moveWeek } from "@/lib/schedule-calendar";
import { cn } from "@/lib/utils";
import Today from "@/pages/Today";
import { Routes } from "@/router";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

const HEAT_CLASSES = ["bg-muted/40", "bg-primary/10", "bg-primary/25", "bg-primary/45", "bg-primary/75 text-primary-foreground"];
type ScheduleView = "past" | "today" | "week" | "month";

const isScheduleView = (value: string | null): value is ScheduleView =>
  value === "past" || value === "today" || value === "week" || value === "month";

const Calendar = () => {
  const t = useTranslate();
  const user = useCurrentUser();
  const { generalSetting } = useInstance();
  const [params, setParams] = useSearchParams();
  const viewParam = params.get("view");
  const view: ScheduleView = isScheduleView(viewParam) ? viewParam : "today";
  const dateParam = params.get("date") || "";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(`${dateParam}T00:00:00`) : new Date();
  const anchor = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const weekStart = ((generalSetting.weekStartDayOffset % 7) + 7) % 7;
  const anchorKey = dateKey(anchor);
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const monthDays = useMemo(() => calendarDays(new Date(`${anchorKey}T00:00:00`), weekStart), [anchorKey, weekStart]);
  const weekDays = useMemo(() => calendarWeekDays(new Date(`${anchorKey}T00:00:00`), weekStart), [anchorKey, weekStart]);
  const isGridView = view === "week" || view === "month";
  const visibleDays = view === "week" ? weekDays : monthDays;

  const { data, isPending, isError, isFetching, error, refetch } = useScheduleCalendar(
    user?.name,
    visibleDays[0],
    addDays(visibleDays[visibleDays.length - 1], 1),
    isGridView,
  );
  const groups = useMemo(() => groupScheduledMemos(data?.memos ?? [], visibleDays), [data, visibleDays]);

  // The "past" tab only appears when there is something overdue to re-plan.
  const { data: hasExpiredMemos } = useHasExpiredMemos(user?.name, startOfToday);
  const showPastTab = view === "past" || hasExpiredMemos === true;

  const navigateTo = useNavigateTo();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const selectedMemos = selectedDate ? (groups.get(dateKey(selectedDate)) ?? []) : [];
  const locale = i18n.language;

  const changeView = (next: ScheduleView) => {
    setSelectedDate(null);
    setParams(next === "week" || next === "month" ? { view: next, date: dateKey(new Date()) } : { view: next });
  };
  const changePeriod = (date: Date) => {
    setSelectedDate(null);
    setParams({ view, date: dateKey(date) });
  };
  const listMemosByTag = (tag: string) => {
    setSelectedDate(null);
    navigateTo(`${Routes.HOME}?filter=${stringifyFilters([{ factor: "tagSearch", value: tag }])}`);
  };

  const monthTitle = anchor.toLocaleDateString(locale, { year: "numeric", month: "long" });
  const weekTitle = `${weekDays[0].toLocaleDateString(locale, { month: "numeric", day: "numeric" })} – ${weekDays[6].toLocaleDateString(
    locale,
    {
      month: "numeric",
      day: "numeric",
    },
  )}`;

  const creatorFilter = buildMemoCreatorFilter(user?.name ?? "");
  const expiredFilter = useMemo(() => {
    const expired = `state == "NORMAL" && plan_end_ts < ${Math.floor(startOfToday.getTime() / 1000)}`;
    return creatorFilter ? `(${expired}) && (${creatorFilter})` : expired;
  }, [creatorFilter, startOfToday]);

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
          {showPastTab && (
            <Button
              size="sm"
              variant={view === "past" ? "secondary" : "ghost"}
              aria-pressed={view === "past"}
              onClick={() => changeView("past")}
            >
              {t("schedule.past")}
            </Button>
          )}
          <Button
            size="sm"
            variant={view === "today" ? "secondary" : "ghost"}
            aria-pressed={view === "today"}
            onClick={() => changeView("today")}
          >
            {t("schedule.today")}
          </Button>
          <Button
            size="sm"
            variant={view === "week" ? "secondary" : "ghost"}
            aria-pressed={view === "week"}
            onClick={() => changeView("week")}
          >
            {t("schedule.week")}
          </Button>
          <Button
            size="sm"
            variant={view === "month" ? "secondary" : "ghost"}
            aria-pressed={view === "month"}
            onClick={() => changeView("month")}
          >
            {t("schedule.month")}
          </Button>
        </div>
      </div>

      {view === "past" ? (
        <PagedMemoList
          renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility showPinned compact />}
          orderBy="plan_end_time asc"
          filter={expiredFilter}
          showFilters={false}
          splitCompleted={false}
          emptyMessage={t("schedule.past-empty")}
        />
      ) : view === "today" ? (
        <Today />
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border bg-card" aria-label={t("schedule.title")} aria-busy={isFetching}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3 sm:p-4">
              <h2 className="text-base font-medium" aria-live="polite">
                {view === "week" ? weekTitle : monthTitle}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("schedule.previous")}
                  onClick={() => changePeriod(view === "week" ? moveWeek(anchor, -1) : moveCalendar(anchor, -1))}
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
                  onClick={() => changePeriod(view === "week" ? moveWeek(anchor, 1) : moveCalendar(anchor, 1))}
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
              <ScheduleDayGrid
                days={visibleDays}
                groups={groups}
                onSelectDay={setSelectedDate}
                anchorMonth={view === "month" ? anchor.getMonth() : undefined}
                ready={!isPending && !isError}
              />
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
          <ScheduleDayDialog
            date={selectedDate}
            memos={selectedMemos}
            onOpenChange={(open) => {
              if (!open) setSelectedDate(null);
            }}
            onTagClick={listMemosByTag}
          />
        </>
      )}
    </div>
  );
};

export default Calendar;
