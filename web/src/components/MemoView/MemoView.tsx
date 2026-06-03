import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";
import { useInstance } from "@/contexts/InstanceContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { useUser } from "@/hooks/useUserQueries";
import { findTagMetadata } from "@/lib/tag";
import { cn } from "@/lib/utils";
import { State } from "@/types/proto/api/v1/common_pb";
import { useTranslate } from "@/utils/i18n";
import { isSuperUser } from "@/utils/user";
import MemoShareImageDialog from "../MemoActionMenu/MemoShareImageDialog";
import MemoEditor from "../MemoEditor";
import PreviewImageDialog from "../PreviewImageDialog";
import { MemoBody, MemoCommentListView, MemoHeader } from "./components";
import { MEMO_CARD_BASE_CLASSES } from "./constants";
import { useImagePreview } from "./hooks";
import { computeCommentAmount, MemoViewContext } from "./MemoViewContext";
import type { MemoViewProps } from "./types";

const MemoView: React.FC<MemoViewProps> = (props: MemoViewProps) => {
  const { memo: memoData, className, parentPage: parentPageProp, compact, showCreator, showVisibility, showPinned } = props;
  const cardRef = useRef<HTMLDivElement>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const t = useTranslate();
  const updateMemo = useUpdateMemo();

  const currentUser = useCurrentUser();
  const { tagsSetting } = useInstance();
  const creator = useUser(memoData.creator).data;
  const isArchived = memoData.state === State.ARCHIVED;
  const isCompleted = memoData.state === State.COMPLETED;
  const readonly = memoData.creator !== currentUser?.name && !isSuperUser(currentUser);
  const parentPage = parentPageProp || "/";
  const hasPlanTime = Boolean(memoData.planStartTime && memoData.planEndTime);
  const showCompleteCheckbox = hasPlanTime && !isArchived && !readonly;

  const handleToggleComplete = useCallback(async () => {
    const newState = isCompleted ? State.NORMAL : State.COMPLETED;
    const msgKey = isCompleted ? "message.uncompleted-successfully" : "message.completed-successfully";
    try {
      await updateMemo.mutateAsync({
        update: { name: memoData.name, state: newState },
        updateMask: ["state"],
      });
      toast.success(t(msgKey as Parameters<typeof t>[0]));
    } catch {
      // error handled by mutation
    }
  }, [isCompleted, memoData.name, updateMemo, t]);

  // Blur content when any tag has blur_content enabled in the instance tag settings.
  const [showBlurredContent, setShowBlurredContent] = useState(false);
  const blurred = memoData.tags?.some((tag) => findTagMetadata(tag, tagsSetting)?.blurContent) ?? false;
  const toggleBlurVisibility = useCallback(() => setShowBlurredContent((prev) => !prev), []);

  const { previewState, openPreview, setPreviewOpen } = useImagePreview();

  const openEditor = useCallback(() => setShowEditor(true), []);
  const closeEditor = useCallback(() => setShowEditor(false), []);

  const location = useLocation();
  const isInMemoDetailPage = location.pathname.startsWith(`/${memoData.name}`) || location.pathname.startsWith("/memos/shares/");
  const showCommentPreview = !isInMemoDetailPage && computeCommentAmount(memoData) > 0;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return;
    }

    const updateWidth = (nextWidth?: number) => {
      const width = Math.round(nextWidth ?? card.getBoundingClientRect().width);
      setCardWidth((prev) => (prev === width ? prev : width));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateWidth();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      updateWidth(entries[0]?.contentRect.width);
    });

    resizeObserver.observe(card);
    return () => resizeObserver.disconnect();
  }, []);

  const contextValue = useMemo(
    () => ({
      memo: memoData,
      creator,
      currentUser,
      parentPage,
      cardWidth,
      isArchived,
      readonly,
      showBlurredContent,
      blurred,
      openEditor,
      toggleBlurVisibility,
      openPreview,
    }),
    [
      memoData,
      creator,
      currentUser,
      parentPage,
      cardWidth,
      isArchived,
      readonly,
      showBlurredContent,
      blurred,
      openEditor,
      toggleBlurVisibility,
      openPreview,
    ],
  );

  if (showEditor) {
    return (
      <MemoEditor
        autoFocus
        className="mb-2"
        cacheKey={`inline-memo-editor-${memoData.name}`}
        memo={memoData}
        parentMemoName={memoData.parent || undefined}
        onConfirm={closeEditor}
        onCancel={closeEditor}
      />
    );
  }

  const article = (
    <article
      className={cn(MEMO_CARD_BASE_CLASSES, showCommentPreview ? "mb-0 rounded-b-none" : "mb-2", className)}
      ref={cardRef}
      tabIndex={readonly ? -1 : 0}
    >
      <MemoHeader showCreator={showCreator} showVisibility={showVisibility} showPinned={showPinned} />

      <MemoBody compact={compact} />

      {showCompleteCheckbox && (
        <div className="w-full flex justify-end mt-1">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleToggleComplete}
            title={isCompleted ? t("common.mark-uncompleted") : t("common.mark-completed")}
          >
            {isCompleted ? <CheckCircle2Icon className="w-4 h-4 text-primary" /> : <CircleIcon className="w-4 h-4" />}
            <span>{isCompleted ? t("common.completed") : t("common.mark-completed")}</span>
          </button>
        </div>
      )}

      <PreviewImageDialog
        open={previewState.open}
        onOpenChange={setPreviewOpen}
        items={previewState.items}
        initialIndex={previewState.index}
      />

      {props.onShareImageDialogOpenChange && (
        <MemoShareImageDialog open={Boolean(props.shareImageDialogOpen)} onOpenChange={props.onShareImageDialogOpenChange} />
      )}
    </article>
  );

  return (
    <MemoViewContext.Provider value={contextValue}>
      {showCommentPreview ? (
        <div className="w-full mb-2">
          {article}
          <MemoCommentListView />
        </div>
      ) : (
        article
      )}
    </MemoViewContext.Provider>
  );
};

export default memo(MemoView);
