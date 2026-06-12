import { timestampDate } from "@bufbuild/protobuf/wkt";
import dayjs from "dayjs";
import { useMemo } from "react";
import { type MemoTimeBasis, useView } from "@/contexts/ViewContext";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

export interface UseMemoSortingOptions {
  pinnedFirst?: boolean;
}

export interface UseMemoSortingResult {
  listSort: (memos: Memo[]) => Memo[];
  orderBy: string;
}

const getMemoSortTime = (memo: Memo, timeBasis: MemoTimeBasis): Date | undefined => {
  switch (timeBasis) {
    case "update_time":
      return memo.updateTime ? timestampDate(memo.updateTime) : undefined;
    case "plan_start_time":
      return memo.planStartTime ? timestampDate(memo.planStartTime) : undefined;
    case "plan_end_time":
      return memo.planEndTime ? timestampDate(memo.planEndTime) : undefined;
    default:
      return memo.createTime ? timestampDate(memo.createTime) : undefined;
  }
};

export const useMemoSorting = (options: UseMemoSortingOptions = {}): UseMemoSortingResult => {
  const { pinnedFirst = false } = options;
  const { orderByTimeAsc, timeBasis } = useView();

  // Generate orderBy string for API
  const orderBy = useMemo(() => {
    if (timeBasis === "smart") {
      // Server-side smart ordering: returns memos sorted by tier
      // (expired → planned → unscheduled → completed).
      return pinnedFirst ? "pinned desc, smart" : "smart";
    }
    const basis = timeBasis;
    const timeOrder = orderByTimeAsc ? `${basis} asc` : `${basis} desc`;
    return pinnedFirst ? `pinned desc, ${timeOrder}` : timeOrder;
  }, [pinnedFirst, orderByTimeAsc, timeBasis]);

  // Generate listSort function for client-side sorting
  const listSort = useMemo(() => {
    if (timeBasis === "smart") {
      // Server handles the tier ordering; no client-side sort needed.
      return (memos: Memo[]): Memo[] => memos;
    }

    return (memos: Memo[]): Memo[] => {
      return memos.sort((a, b) => {
        // First, sort by pinned status if enabled
        if (pinnedFirst && a.pinned !== b.pinned) {
          return b.pinned ? 1 : -1;
        }

        // Then sort by the selected time field.
        const aTime = getMemoSortTime(a, timeBasis);
        const bTime = getMemoSortTime(b, timeBasis);
        return orderByTimeAsc ? dayjs(aTime).unix() - dayjs(bTime).unix() : dayjs(bTime).unix() - dayjs(aTime).unix();
      });
    };
  }, [pinnedFirst, orderByTimeAsc, timeBasis]);

  return { listSort, orderBy };
};
