import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import i18n from "@/i18n";
import {
  createDayPlanTimeRange,
  createPresetPlanTimeRange,
  DEFAULT_PLAN_TIME_PRESET,
  isSameDay,
  monthDaysOf,
  monthLeadingBlanks,
  PLAN_TIME_RELATIVE_PRESETS,
  PLAN_TIME_TOMORROW_PRESET,
  type PlanTimePickerScope,
  type PlanTimePreset,
  weekDaysOf,
} from "@/lib/plan-time";
import { useTranslate } from "@/utils/i18n";
import { validationService } from "../services";
import { useEditorContext } from "../state";
import InsertMenu from "../Toolbar/InsertMenu";
import VisibilitySelector from "../Toolbar/VisibilitySelector";
import type { EditorToolbarProps } from "../types";

export const PlanTimeEditor: FC<{
  planStartTime?: Date;
  planEndTime?: Date;
  onChange: (times: { planStartTime?: Date; planEndTime?: Date }) => void;
  /** Completed memos have a frozen timeline — plan times can no longer change. */
  disabled?: boolean;
}> = ({ planStartTime, planEndTime, onChange, disabled = false }) => {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [pickerScope, setPickerScope] = useState<PlanTimePickerScope | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  // The current time is kept in state and refreshed every minute, so a plan
  // window that has passed is marked as stale even while the editor stays
  // open for hours.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const hasPlanTime = !!(planStartTime && planEndTime);
  const hasAnyPlanTime = !!(planStartTime || planEndTime);
  const isStale = !!planStartTime && planStartTime.getTime() < now.getTime();

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    if (!newOpen) {
      setIsCustomMode(false);
      setPickerScope(null);
    }
    setOpen(newOpen);
  };

  const handlePreset = (preset: PlanTimePreset) => {
    onChange(createPresetPlanTimeRange(preset, new Date()));
    setOpen(false);
  };

  const handlePickDay = (day: Date) => {
    onChange(createDayPlanTimeRange(day, new Date()));
    setPickerScope(null);
    setOpen(false);
  };

  const handleCustom = () => {
    if (!hasAnyPlanTime) onChange(createPresetPlanTimeRange(DEFAULT_PLAN_TIME_PRESET, new Date()));
    setPickerScope(null);
    setIsCustomMode(true);
  };

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatDate = (d?: Date) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "");
  const getHour = (d?: Date) => (d ? d.getHours() : 0);
  const getMinute = (d?: Date) => (d ? Math.floor(d.getMinutes() / 5) * 5 : 0);

  const displayRange = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return `${start.toLocaleString(undefined, opts)} ~ ${end.toLocaleString(undefined, opts)}`;
  };

  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const allMinutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const minDate = formatDate(now);
  const startDate = formatDate(planStartTime);
  const endDate = formatDate(planEndTime);
  const sameDayRange = !!(planStartTime && planEndTime && startDate === endDate);

  const locale = i18n.language;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }));

  // Start time constraints: if today, restrict to >= now
  const startMinHour = startDate === minDate ? now.getHours() : 0;
  const startMinMinute = startDate === minDate ? Math.ceil(now.getMinutes() / 5) * 5 : 0;

  // End time constraints: if same day as start, restrict to >= start time
  const endMinHour = sameDayRange ? getHour(planStartTime) : 0;
  const endMinMinute = sameDayRange ? getMinute(planStartTime) : 0;

  const filteredHours = (min: number) => allHours.filter((h) => h >= min);
  const filteredMinutes = (min: number) => allMinutes.filter((m) => m >= min);

  const handleStartDateChange = (dateStr: string) => {
    if (!dateStr) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
      return;
    }
    const [y, mo, d] = dateStr.split("-").map(Number);
    // Keep existing time or use 00:00
    let h = getHour(planStartTime);
    let m = getMinute(planStartTime);
    // If today, clamp to >= now
    if (dateStr === minDate) {
      const nh = now.getHours();
      const nm = Math.ceil(now.getMinutes() / 5) * 5;
      if (h < nh || (h === nh && m < nm)) {
        h = nh;
        m = nm;
      }
    }
    const newStart = new Date(y, mo - 1, d, h, m, 0, 0);
    const todayEnd = new Date(y, mo - 1, d, 23, 55, 0, 0);
    const defaultEnd =
      todayEnd.getTime() - newStart.getTime() >= 60 * 60 * 1000 ? todayEnd : new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);
    const newEnd = !planEndTime || planEndTime < newStart ? defaultEnd : planEndTime;
    onChange({ planStartTime: newStart, planEndTime: newEnd });
  };

  const handleStartTimeChange = (field: "h" | "m", value: number) => {
    if (!planStartTime) return;
    const newStart = new Date(planStartTime);
    if (field === "h") newStart.setHours(value);
    else newStart.setMinutes(value);
    // If same day and end < new start, bump end to start + 5min
    let newEnd = planEndTime;
    if (planEndTime && formatDate(newStart) === formatDate(planEndTime) && planEndTime <= newStart) {
      newEnd = new Date(newStart.getTime() + 5 * 60 * 1000);
    } else if (!planEndTime || planEndTime < newStart) {
      const y = newStart.getFullYear();
      const mo = newStart.getMonth();
      const d = newStart.getDate();
      const todayEnd = new Date(y, mo, d, 23, 55, 0, 0);
      newEnd = todayEnd.getTime() - newStart.getTime() >= 60 * 60 * 1000 ? todayEnd : new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);
    }
    onChange({ planStartTime: newStart, planEndTime: newEnd });
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!dateStr) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
      return;
    }
    if (!planStartTime) return;
    const h = getHour(planEndTime);
    const m = getMinute(planEndTime);
    const [y, mo, d] = dateStr.split("-").map(Number);
    const newEnd = new Date(y, mo - 1, d, h, m, 0, 0);
    // If same day as start and end < start, bump end time
    if (dateStr === startDate && newEnd <= planStartTime!) {
      newEnd.setHours(getHour(planStartTime), getMinute(planStartTime) + 5, 0, 0);
    }
    onChange({ planStartTime, planEndTime: newEnd });
  };

  const handleEndTimeChange = (field: "h" | "m", value: number) => {
    if (!planStartTime || !planEndTime) return;
    const newEnd = new Date(planEndTime);
    if (field === "h") newEnd.setHours(value);
    else newEnd.setMinutes(value);
    onChange({ planStartTime, planEndTime: newEnd });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title={isStale ? t("editor.plan-time.stale") : undefined}
          className={`min-w-0 max-w-full ${hasPlanTime && !isStale ? "text-primary bg-primary/10" : ""} ${isStale ? "text-muted-foreground line-through" : ""}`}
        >
          <CalendarIcon className="w-4 h-auto" />
          {hasPlanTime && <span className="ml-1 truncate text-xs">{displayRange(planStartTime, planEndTime)}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className={`max-w-[calc(100vw-2rem)] ${pickerScope === "month" ? "w-[380px]" : "w-[336px]"}`}>
        <div className="flex flex-col gap-3 p-1">
          {isCustomMode ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t("common.plan-start")}</label>
                <div className="flex flex-row gap-1.5 items-end">
                  <input
                    type="date"
                    min={minDate}
                    className="min-w-0 w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                  <select
                    className="w-[52px] rounded-md border border-input bg-background px-1 py-1.5 text-xs"
                    value={getHour(planStartTime)}
                    onChange={(e) => handleStartTimeChange("h", Number(e.target.value))}
                  >
                    {filteredHours(startMinHour).map((h) => (
                      <option key={h} value={h}>
                        {pad(h)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground -ml-0.5">:</span>
                  <select
                    className="w-[52px] rounded-md border border-input bg-background px-1 py-1.5 text-xs"
                    value={getMinute(planStartTime)}
                    onChange={(e) => handleStartTimeChange("m", Number(e.target.value))}
                  >
                    {filteredMinutes(planStartTime?.getHours() === startMinHour ? startMinMinute : 0).map((m) => (
                      <option key={m} value={m}>
                        {pad(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t("common.plan-end")}</label>
                <div className="flex flex-row gap-1.5 items-end">
                  <input
                    type="date"
                    min={startDate || minDate}
                    className="min-w-0 w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    disabled={!planStartTime}
                  />
                  <select
                    className="w-[52px] rounded-md border border-input bg-background px-1 py-1.5 text-xs"
                    value={getHour(planEndTime)}
                    onChange={(e) => handleEndTimeChange("h", Number(e.target.value))}
                    disabled={!planStartTime}
                  >
                    {filteredHours(endMinHour).map((h) => (
                      <option key={h} value={h}>
                        {pad(h)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground -ml-0.5">:</span>
                  <select
                    className="w-[52px] rounded-md border border-input bg-background px-1 py-1.5 text-xs"
                    value={getMinute(planEndTime)}
                    onChange={(e) => handleEndTimeChange("m", Number(e.target.value))}
                    disabled={!planStartTime}
                  >
                    {filteredMinutes(sameDayRange && planEndTime?.getHours() === endMinHour ? endMinMinute : 0).map((m) => (
                      <option key={m} value={m}>
                        {pad(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {hasAnyPlanTime && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange({ planStartTime: undefined, planEndTime: undefined });
                    setOpen(false);
                  }}
                >
                  {t("common.clear")}
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium">{t("editor.plan-time.title")}</p>
              <div className="grid grid-cols-3 gap-2">
                {PLAN_TIME_RELATIVE_PRESETS.map((preset) => (
                  <Button key={preset.id} variant="outline" size="sm" onClick={() => handlePreset(preset)}>
                    {t(`editor.plan-time.${preset.id}` as Parameters<typeof t>[0])}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePreset(PLAN_TIME_TOMORROW_PRESET)}>
                  {t("editor.plan-time.tomorrow")}
                </Button>
                <Button variant={pickerScope === "week" ? "secondary" : "outline"} size="sm" onClick={() => setPickerScope("week")}>
                  {t("editor.plan-time.this-week")}
                </Button>
                <Button variant={pickerScope === "month" ? "secondary" : "outline"} size="sm" onClick={() => setPickerScope("month")}>
                  {t("editor.plan-time.this-month")}
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={handleCustom}>
                {t("editor.plan-time.custom")}
              </Button>
              {pickerScope === "week" && (
                <div className="grid grid-cols-7 gap-1">
                  {weekDaysOf(now).map((day) => (
                    <Button
                      key={day.toISOString()}
                      variant={isSameDay(day, now) ? "secondary" : "outline"}
                      size="sm"
                      className="h-auto flex-col gap-0 px-0 py-1"
                      disabled={day < startOfToday}
                      onClick={() => handlePickDay(day)}
                    >
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {day.toLocaleDateString(locale, { weekday: "short" })}
                      </span>
                      <span className="text-sm">{day.getDate()}</span>
                    </Button>
                  ))}
                </div>
              )}
              {pickerScope === "month" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("editor.plan-time.previous-month")}
                      onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                    >
                      <ChevronLeftIcon className="size-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {monthCursor.toLocaleDateString(locale, { year: "numeric", month: "long" })}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("editor.plan-time.next-month")}
                      onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                    >
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekdayLabels.map((label) => (
                      <span key={label} className="text-center text-[10px] text-muted-foreground">
                        {label}
                      </span>
                    ))}
                    {Array.from({ length: monthLeadingBlanks(monthCursor) }, (_, i) => (
                      <span key={`blank-${i}`} />
                    ))}
                    {monthDaysOf(monthCursor).map((day) => (
                      <Button
                        key={day.toISOString()}
                        variant={isSameDay(day, now) ? "secondary" : "ghost"}
                        size="sm"
                        className="h-auto px-0 py-1"
                        disabled={day < startOfToday}
                        onClick={() => handlePickDay(day)}
                      >
                        {day.getDate()}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {hasAnyPlanTime && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange({ planStartTime: undefined, planEndTime: undefined });
                    setOpen(false);
                  }}
                >
                  {t("common.clear")}
                </Button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const EditorToolbar: FC<EditorToolbarProps> = ({ onSave, onCancel, memoName, onAudioRecorderClick, planTimeDisabled }) => {
  const t = useTranslate();
  const { state, actions, dispatch } = useEditorContext();
  const { valid } = validationService.canSave(state);

  const isSaving = state.ui.isLoading.saving;

  const handleLocationChange = (location: typeof state.metadata.location) => {
    dispatch(actions.setMetadata({ location }));
  };

  const handleToggleFocusMode = () => {
    dispatch(actions.toggleFocusMode());
  };

  const handleVisibilityChange = (visibility: typeof state.metadata.visibility) => {
    dispatch(actions.setMetadata({ visibility }));
  };

  return (
    <div className="w-full flex flex-row flex-wrap justify-between items-center gap-2 mb-2">
      <div className="flex flex-row justify-start items-center">
        <InsertMenu
          isUploading={state.ui.isLoading.uploading}
          location={state.metadata.location}
          onLocationChange={handleLocationChange}
          onToggleFocusMode={handleToggleFocusMode}
          memoName={memoName}
          onAudioRecorderClick={onAudioRecorderClick}
        />
      </div>

      <PlanTimeEditor
        planStartTime={state.timestamps.planStartTime}
        planEndTime={state.timestamps.planEndTime}
        onChange={(times) => dispatch(actions.setTimestamps(times))}
        disabled={planTimeDisabled}
      />
      <div className="ml-auto max-w-full flex flex-wrap justify-end items-center gap-2">
        <VisibilitySelector value={state.metadata.visibility} onChange={handleVisibilityChange} />

        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
        )}

        <Button className="shrink-0" onClick={onSave} disabled={!valid || isSaving}>
          {isSaving ? t("editor.saving") : t("editor.save")}
        </Button>
      </div>
    </div>
  );
};
