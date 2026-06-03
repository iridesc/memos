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

  const formatDatetime = (d?: Date) => {
    if (!d) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const displayRange = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const opts: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return `${start.toLocaleString(undefined, opts)} ~ ${end.toLocaleString(undefined, opts)}`;
  };

  const handleStartChange = (value: string) => {
    const newStart = value ? new Date(value) : undefined;
    if (!newStart) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
    } else {
      // Default end = start + 24h if end is not set or is before the new start
      const defaultEnd = new Date(newStart.getTime() + 24 * 60 * 60 * 1000);
      const newEnd = !planEndTime || planEndTime < newStart ? defaultEnd : planEndTime;
      onChange({ planStartTime: newStart, planEndTime: newEnd });
    }
  };

  const handleEndChange = (value: string) => {
    const newEnd = value ? new Date(value) : undefined;
    if (!newEnd) {
      onChange({ planStartTime: undefined, planEndTime: undefined });
    } else if (!planStartTime) {
      return;
    } else {
      onChange({ planStartTime, planEndTime: newEnd });
    }
  };

  const now = new Date();
  const minDatetime = formatDatetime(now);

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
            <input
              type="datetime-local"
              min={minDatetime}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={formatDatetime(planStartTime)}
              onChange={(e) => handleStartChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">{t("common.plan-end")}</label>
            <input
              type="datetime-local"
              min={planStartTime ? formatDatetime(planStartTime) : minDatetime}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value={formatDatetime(planEndTime)}
              onChange={(e) => handleEndChange(e.target.value)}
              disabled={!planStartTime}
            />
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
