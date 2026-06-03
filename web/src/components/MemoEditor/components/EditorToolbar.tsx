import { CalendarIcon } from "lucide-react";
import { type FC, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslate } from "@/utils/i18n";
import { validationService } from "../services";
import { useEditorContext } from "../state";
import InsertMenu from "../Toolbar/InsertMenu";
import VisibilitySelector from "../Toolbar/VisibilitySelector";
import type { EditorToolbarProps } from "../types";

const PlanTimeEditor: FC<{
  planStartTime?: Date;
  planEndTime?: Date;
  onChange: (times: { planStartTime?: Date; planEndTime?: Date }) => void;
}> = ({ planStartTime, planEndTime, onChange }) => {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const hasPlanTime = !!(planStartTime && planEndTime);
  const hasAnyPlanTime = !!(planStartTime || planEndTime);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formatDate = (d?: Date) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "");
  const formatTime = (d?: Date) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "");

  const displayRange = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return `${start.toLocaleString(undefined, opts)} ~ ${end.toLocaleString(undefined, opts)}`;
  };

  const mergeDateAndTime = (dateStr: string, timeStr: string, fallback?: Date): Date | undefined => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = fallback ? new Date(fallback) : new Date();
    date.setFullYear(y, m - 1, d);
    if (timeStr) {
      const [h, min] = timeStr.split(":").map(Number);
      date.setHours(h, min, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const handleStartDateChange = (dateStr: string) => {
    const timeStr = formatTime(planStartTime) || "00:00";
    const newStart = mergeDateAndTime(dateStr, timeStr);
    if (!newStart) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
    } else {
      const defaultEnd = new Date(newStart.getTime() + 24 * 60 * 60 * 1000);
      const newEnd = !planEndTime || planEndTime < newStart ? defaultEnd : planEndTime;
      onChange({ planStartTime: newStart, planEndTime: newEnd });
    }
  };

  const handleStartTimeChange = (timeStr: string) => {
    if (!planStartTime) return;
    const newStart = new Date(planStartTime);
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      newStart.setHours(h, m, 0, 0);
    }
    const defaultEnd = new Date(newStart.getTime() + 24 * 60 * 60 * 1000);
    const newEnd = !planEndTime || planEndTime < newStart ? defaultEnd : planEndTime;
    onChange({ planStartTime: newStart, planEndTime: newEnd });
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!dateStr) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
      return;
    }
    if (!planStartTime) return;
    const timeStr = formatTime(planEndTime) || "00:00";
    const newEnd = mergeDateAndTime(dateStr, timeStr, planEndTime);
    if (newEnd) onChange({ planStartTime, planEndTime: newEnd });
  };

  const handleEndTimeChange = (timeStr: string) => {
    if (!planStartTime || !planEndTime) return;
    const newEnd = new Date(planEndTime);
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      newEnd.setHours(h, m, 0, 0);
    }
    onChange({ planStartTime, planEndTime: newEnd });
  };

  const now = new Date();
  const minDate = formatDate(now);
  const minTime = formatTime(now);
  const startDate = formatDate(planStartTime);
  const startTime = formatTime(planStartTime);
  const endDate = formatDate(planEndTime);
  const endTime = formatTime(planEndTime);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={hasPlanTime ? "text-primary bg-primary/10" : ""}>
          <CalendarIcon className="w-4 h-auto" />
          {hasPlanTime && <span className="ml-1 text-xs">{displayRange(planStartTime, planEndTime)}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3 p-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t("common.plan-start")}</label>
            <div className="flex flex-row gap-2">
              <input
                type="date"
                min={minDate}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
              <input
                type="time"
                min={startDate === minDate ? minTime : undefined}
                className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t("common.plan-end")}</label>
            <div className="flex flex-row gap-2">
              <input
                type="date"
                min={startDate || minDate}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                disabled={!planStartTime}
              />
              <input
                type="time"
                className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                disabled={!planStartTime}
              />
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
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const EditorToolbar: FC<EditorToolbarProps> = ({ onSave, onCancel, memoName, onAudioRecorderClick }) => {
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
    <div className="w-full flex flex-row justify-between items-center mb-2">
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
      />
      <div className="flex flex-row justify-end items-center gap-2">
        <VisibilitySelector value={state.metadata.visibility} onChange={handleVisibilityChange} />

        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
        )}

        <Button onClick={onSave} disabled={!valid || isSaving}>
          {isSaving ? t("editor.saving") : t("editor.save")}
        </Button>
      </div>
    </div>
  );
};
