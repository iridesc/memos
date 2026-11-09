import { timestampDate } from "@bufbuild/protobuf/wkt";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";
import MemoTags from "@/components/MemoTags";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import i18n from "@/i18n";
import { formatLongDate, stripTagsFromPreview } from "@/lib/schedule-calendar";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface Props {
  /** Selected day, or null when the dialog is closed. */
  date: Date | null;
  /** Memos planned on the selected day. */
  memos: Memo[];
  onOpenChange: (open: boolean) => void;
  onTagClick: (tag: string) => void;
}

/** Dialog listing the memos planned on one day of the schedule. */
const ScheduleDayDialog = ({ date, memos, onOpenChange, onTagClick }: Props) => {
  const t = useTranslate();
  const locale = i18n.language;

  return (
    <Dialog open={!!date} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{date && formatLongDate(date, locale)}</DialogTitle>
          <DialogDescription>{t("schedule.count", { count: memos.length })}</DialogDescription>
        </DialogHeader>
        {memos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("schedule.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {memos.map((memo) => {
              const preview = stripTagsFromPreview(memo.content, memo.tags);
              return (
                <li key={memo.name}>
                  <div className="rounded-lg border transition-colors hover:bg-accent focus-within:outline-2 focus-within:outline-primary">
                    <Link to={`/${memo.name}`} className="flex items-start gap-3 p-3">
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
                          {preview || t("schedule.untitled")}
                        </p>
                        {memo.planStartTime && memo.planEndTime && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {timestampDate(memo.planStartTime).toLocaleString(locale, {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {timestampDate(memo.planEndTime).toLocaleString(locale, {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
                    </Link>
                    <MemoTags tags={memo.tags} className="px-3 pb-3" onTagClick={onTagClick} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDayDialog;
