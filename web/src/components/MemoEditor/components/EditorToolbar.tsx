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
  const getHour = (d?: Date) => (d ? d.getHours() : 0);
  const getMinute = (d?: Date) => (d ? Math.floor(d.getMinutes() / 5) * 5 : 0);

  const displayRange = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return `${start.toLocaleString(undefined, opts)} ~ ${end.toLocaleString(undefined, opts)}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleStartDateChange = (dateStr: string) => {
    const h = getHour(planStartTime);
    const m = getMinute(planStartTime);
    if (!dateStr) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
      return;
    }
    const [y, mo, d] = dateStr.split("-").map(Number);
    const newStart = new Date(y, mo - 1, d, h, m, 0, 0);
    const defaultEnd = new Date(newStart.getTime() + 24 * 60 * 60 * 1000);
    const newEnd = !planEndTime || planEndTime < newStart ? defaultEnd : planEndTime;
    onChange({ planStartTime: newStart, planEndTime: newEnd });
  };

  const handleStartTimeChange = (field: "h" | "m", value: number) => {
    if (!planStartTime) return;
    const newStart = new Date(planStartTime);
    if (field === "h") newStart.setHours(value);
    else newStart.setMinutes(value);
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
    const h = getHour(planEndTime);
    const m = getMinute(planEndTime);
    const [y, mo, d] = dateStr.split("-").map(Number);
    const newEnd = new Date(y, mo - 1, d, h, m, 0, 0);
    onChange({ planStartTime, planEndTime: newEnd });
  };

  const handleEndTimeChange = (field: "h" | "m", value: number) => {
    if (!planStartTime || !planEndTime) return;
    const newEnd = new Date(planEndTime);
    if (field === "h") newEnd.setHours(value);
    else newEnd.setMinutes(value);
    onChange({ planStartTime, planEndTime: newEnd });
  };

  const now = new Date();
  const minDate = formatDate(now);
  const startDate = formatDate(planStartTime);
  const endDate = formatDate(planEndTime);

  const timeSelect = (d: Date | undefined, disabled: boolean, onChange: (field: "h" | "m", value: number) => void) => (
    <div className="flex flex-row gap-1 items-center">
      <span className="text-xs text-muted-foreground">{pad(getHour(d))}</span>
      <select
        className="w-14 rounded-md border border-input bg-background px-1 py-1.5 text-xs"
        value={getHour(d)}
        onChange={(e) => onChange("h", Number(e.target.value))}
        disabled={disabled}
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {pad(h)}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>
      <select
        className="w-14 rounded-md border border-input bg-background px-1 py-1.5 text-xs"
        value={getMinute(d)}
        onChange={(e) => onChange("m", Number(e.target.value))}
        disabled={disabled}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {pad(m)}
          </option>
        ))}
      </select>
    </div>
  );

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
            <div className="flex flex-row gap-2 items-end">
              <input
                type="date"
                min={minDate}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
              {timeSelect(planStartTime, false, handleStartTimeChange)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t("common.plan-end")}</label>
            <div className="flex flex-row gap-2 items-end">
              <input
                type="date"
                min={startDate || minDate}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                disabled={!planStartTime}
              />
              {timeSelect(planEndTime, !planStartTime, handleEndTimeChange)}
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
