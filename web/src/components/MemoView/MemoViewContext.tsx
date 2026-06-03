import { timestampDate } from "@bufbuild/protobuf/wkt";
import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { MemoRelation_Type } from "@/types/proto/api/v1/memo_service_pb";
import type { User } from "@/types/proto/api/v1/user_service_pb";
import type { PreviewMediaItem } from "@/utils/media-item";

export interface MemoViewContextValue {
  memo: Memo;
  creator: User | undefined;
  currentUser: User | undefined;
  parentPage: string;
  cardWidth: number;
  isArchived: boolean;
  readonly: boolean;
  showBlurredContent: boolean;
  blurred: boolean;
  openEditor: () => void;
  toggleBlurVisibility: () => void;
  openPreview: (items: string | string[] | PreviewMediaItem[], index?: number) => void;
}

export const MemoViewContext = createContext<MemoViewContextValue | null>(null);

export const useMemoViewContext = (): MemoViewContextValue => {
  const context = useContext(MemoViewContext);
  if (!context) {
    throw new Error("useMemoViewContext must be used within MemoViewContext.Provider");
  }
  return context;
};

export const computeCommentAmount = (memo: Memo): number =>
  memo.relations.filter((r) => r.type === MemoRelation_Type.COMMENT && r.relatedMemo?.name === memo.name).length;

export const useMemoViewDerived = () => {
  const { memo, isArchived, readonly } = useMemoViewContext();
  const location = useLocation();

  const isInMemoDetailPage = location.pathname.startsWith(`/${memo.name}`) || location.pathname.startsWith("/memos/shares/");
  const commentAmount = computeCommentAmount(memo);

  const createTime = memo.createTime ? timestampDate(memo.createTime) : undefined;
  const updateTime = memo.updateTime ? timestampDate(memo.updateTime) : undefined;
  const planStartTime = memo.planStartTime ? timestampDate(memo.planStartTime) : undefined;
  const planEndTime = memo.planEndTime ? timestampDate(memo.planEndTime) : undefined;

  return {
    isArchived,
    readonly,
    isInMemoDetailPage,
    commentAmount,
    createTime,
    updateTime,
    planStartTime,
    planEndTime,
  };
};
