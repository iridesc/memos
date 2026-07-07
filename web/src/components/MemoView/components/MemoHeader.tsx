import { BookmarkIcon, CheckIcon } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import useNavigateTo from "@/hooks/useNavigateTo";
import i18n from "@/i18n";
import { formatRelativePlanTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/v1/common_pb";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import { convertVisibilityToString } from "@/utils/memo";
import MemoActionMenu from "../../MemoActionMenu";
import { ReactionSelector } from "../../MemoReactionListView";
import UserAvatar from "../../UserAvatar";
import VisibilityIcon from "../../VisibilityIcon";
import { useMemoActions } from "../hooks";
import { useMemoViewContext, useMemoViewDerived } from "../MemoViewContext";
import type { MemoHeaderProps } from "../types";

const MemoHeader: React.FC<MemoHeaderProps> = ({ showCreator, showVisibility, showPinned }) => {
  const t = useTranslate();
  const [reactionSelectorOpen, setReactionSelectorOpen] = useState(false);

  const { memo, creator, currentUser, parentPage, isArchived, readonly, openEditor } = useMemoViewContext();
  const { createTime, updateTime, planStartTime, planEndTime } = useMemoViewDerived();
  const updateMemo = useUpdateMemo();

  const navigateTo = useNavigateTo();
  const handleGotoMemoDetailPage = useCallback(() => {
    navigateTo(`/${memo.name}`, { state: { from: parentPage } });
  }, [memo.name, parentPage, navigateTo]);

  const { unpinMemo } = useMemoActions(memo);

  // Complete toggle — show when memo has plan times and user can edit.
  const isCompleted = memo.state === State.COMPLETED;
  const hasPlanTime = Boolean(planStartTime && planEndTime);
  const showCompleteCheckbox = hasPlanTime && !isArchived && !readonly;

  const handleToggleComplete = useCallback(async () => {
    const newState = isCompleted ? State.NORMAL : State.COMPLETED;
    const msgKey = isCompleted ? "message.uncompleted-successfully" : "message.completed-successfully";
    try {
      await updateMemo.mutateAsync({
        update: { name: memo.name, state: newState },
        updateMask: ["state"],
      });
      toast.success(t(msgKey as Parameters<typeof t>[0]));
    } catch {
      // error handled by mutation
    }
  }, [isCompleted, memo.name, updateMemo, t]);

  const timeTooltip = {
    createdAt: createTime ? `${t("common.created-at")}: ${createTime.toLocaleString(i18n.language)}` : undefined,
    updatedAt: updateTime ? `${t("common.last-updated-at")}: ${updateTime.toLocaleString(i18n.language)}` : undefined,
    planStart: planStartTime ? `\u{1F4C5} ${t("common.plan-start")}: ${planStartTime.toLocaleString(i18n.language)}` : undefined,
    planEnd: planEndTime ? `\u{1F4C5} ${t("common.plan-end")}: ${planEndTime.toLocaleString(i18n.language)}` : undefined,
  };

  return (
    <div className="w-full flex flex-row justify-between items-center gap-2">
      <div className="w-auto max-w-[calc(100%-8rem)] grow flex flex-row justify-start items-center">
        {showCreator && creator && (
          <Link
            className="w-auto hover:opacity-80 rounded-md transition-colors"
            to={`/u/${encodeURIComponent(creator.username)}`}
            viewTransition
          >
            <UserAvatar className="mr-2 shrink-0" avatarUrl={creator.avatarUrl} />
          </Link>
        )}
        {showCreator && creator && (
          <Link
            className="block leading-tight hover:opacity-80 rounded-md transition-colors truncate text-muted-foreground mr-2"
            to={`/u/${encodeURIComponent(creator.username)}`}
            viewTransition
          >
            {creator.displayName || creator.username}
          </Link>
        )}
        <PlanTimeDisplay
          planStartTime={planStartTime}
          planEndTime={planEndTime}
          updateTime={updateTime}
          isCompleted={isCompleted}
          timeTooltip={timeTooltip}
          onGotoDetail={handleGotoMemoDetailPage}
        />
      </div>

      <div className="flex flex-row justify-end items-center select-none shrink-0 gap-2">
        {currentUser && !isArchived && (
          <ReactionSelector
            className={cn("border-none w-auto h-auto", reactionSelectorOpen && "block!", "block sm:hidden sm:group-hover:block")}
            memo={memo}
            onOpenChange={setReactionSelectorOpen}
          />
        )}
        {showCompleteCheckbox && (
          <button
            type="button"
            className="shrink-0 hover:opacity-80 transition-opacity"
            onClick={handleToggleComplete}
            title={isCompleted ? t("common.mark-uncompleted") : t("common.mark-completed")}
          >
            <CheckIcon className={cn("w-4 h-4", isCompleted ? "text-green-500" : "text-muted-foreground")} />
          </button>
        )}

        {showVisibility && memo.visibility !== Visibility.PRIVATE && (
          <Tooltip>
            <TooltipTrigger>
              <span className="flex justify-center items-center rounded-md hover:opacity-80">
                <VisibilityIcon visibility={memo.visibility} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t(`memo.visibility.${convertVisibilityToString(memo.visibility).toLowerCase()}` as Parameters<typeof t>[0])}
            </TooltipContent>
          </Tooltip>
        )}

        {showPinned && memo.pinned && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <BookmarkIcon className="w-4 h-auto text-primary" onClick={unpinMemo} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("common.unpin")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <MemoActionMenu memo={memo} readonly={readonly} onEdit={openEditor} />
      </div>
    </div>
  );
};

interface TimeTooltipContent {
  createdAt?: string;
  updatedAt?: string;
  planStart?: string;
  planEnd?: string;
}

const TimeTooltip = ({ children, content }: { children: React.ReactElement; content: TimeTooltipContent }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent align="start" className="flex flex-col items-start gap-0.5 whitespace-nowrap text-left">
      {content.createdAt && <span>{content.createdAt}</span>}
      {content.updatedAt && <span>{content.updatedAt}</span>}
      {content.planStart && <span>{content.planStart}</span>}
      {content.planEnd && <span>{content.planEnd}</span>}
    </TooltipContent>
  </Tooltip>
);

const PlanTimeDisplay: React.FC<{
  planStartTime?: Date;
  planEndTime?: Date;
  updateTime?: Date;
  isCompleted?: boolean;
  timeTooltip: TimeTooltipContent;
  onGotoDetail: () => void;
}> = ({ planStartTime, planEndTime, updateTime, isCompleted, timeTooltip, onGotoDetail }) => {
  const t = useTranslate();

  if (!planStartTime || !planEndTime) return null;

  // Completed memos: show green "已完成" with completion date.
  if (isCompleted) {
    const dateStr = updateTime ? updateTime.toLocaleDateString(i18n.language, { month: "numeric", day: "numeric" }) : "";
    return (
      <TimeTooltip content={timeTooltip}>
        <button
          type="button"
          className="text-xs ml-2 whitespace-nowrap select-none cursor-pointer transition-colors text-left text-green-500 font-bold"
          onClick={onGotoDetail}
        >
          {t("common.completed")}
          {dateStr && <span className="ml-1 font-normal text-muted-foreground">{dateStr}</span>}
        </button>
      </TimeTooltip>
    );
  }

  const result = formatRelativePlanTime(planStartTime, planEndTime, new Date());
  let displayText: string;

  let isExpired = false;

  switch (result.state) {
    case "expired":
      isExpired = true;
      displayText = t("common.plan-time.expired");
      break;
    case "in-progress":
      if (result.isEndImminent) {
        displayText = t("common.plan-time.ends-imminent");
      } else if (result.remaining) {
        const timeStr = formatUnit(result.remaining, t);
        displayText = t("common.plan-time.in-progress", { time: timeStr });
      } else {
        displayText = t("common.plan-time.in-progress", { time: "" });
      }
      break;
    case "not-started":
    default:
      if (result.isStartImminent && result.duration) {
        const durStr = formatUnit(result.duration, t);
        displayText = t("common.plan-time.starts-imminent", { duration: durStr });
      } else if (result.startOffset && result.duration) {
        const startStr = formatUnit(result.startOffset, t);
        const durStr = formatUnit(result.duration, t);
        displayText = t("common.plan-time.not-started", { time: startStr, duration: durStr });
      } else if (result.startOffset) {
        const startStr = formatUnit(result.startOffset, t);
        displayText = t("common.plan-time.not-started", { time: startStr, duration: "0m" });
      } else {
        displayText = "";
      }
      break;
  }

  if (!displayText) return null;

  const expiredClass = isExpired ? "text-destructive font-bold hover:opacity-80" : "text-muted-foreground hover:text-foreground";

  return (
    <TimeTooltip content={timeTooltip}>
      <button
        type="button"
        className={`text-xs ml-2 whitespace-nowrap select-none cursor-pointer transition-colors text-left ${expiredClass}`}
        onClick={onGotoDetail}
      >
        {displayText}
      </button>
    </TimeTooltip>
  );
};

function formatUnit(twu: { value: number; unit: string }, t: ReturnType<typeof useTranslate>): string {
  const key = `common.plan-time.unit-${twu.unit}` as Parameters<typeof t>[0];
  return t(key, { count: twu.value });
}

export default MemoHeader;
