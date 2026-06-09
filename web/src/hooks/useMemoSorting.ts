import { timestampDate } from "@bufbuild/protobuf/wkt";
import dayjs from "dayjs";
import { useMemo } from "react";
import { type MemoTimeBasis, useView } from "@/contexts/ViewContext";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

export interface UseMemoSortingOptions {
  pinnedFirst?: boolean;
  state?: State;
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

/**
 * Smart sort: groups memos into 4 tiers and sorts within each tier client-side.
 *
 * Tier order (top to bottom):
 *   1. Expired        — planEndTime < now                    → plan_start_time desc
 *   2. Planned active — has plan times, not expired          → plan_start_time desc
 *   3. Unscheduled    — no planStartTime                     → update_time desc
 *   4. Completed      — state === COMPLETED                  → update_time desc
 */
function smartSort(memos: Memo[], pinnedFirst: boolean): Memo[] {
  const now = new Date().getTime();

  const getTier = (m: Memo): number => {
    if (m.state === State.COMPLETED) return 4;
    if (!m.planStartTime || !m.planEndTime) return 3;
    if (timestampDate(m.planEndTime).getTime() < now) return 1;
    return 2;
  };

  return memos.sort((a, b) => {
    // Pinned first (within same tier)
    if (pinnedFirst && a.pinned !== b.pinned) {
      return b.pinned ? 1 : -1;
    }

    const aTier = getTier(a);
    const bTier = getTier(b);
    if (aTier !== bTier) return aTier - bTier;

    // Within tier 1 or 2: plan_start_time desc
    if (aTier === 1 || aTier === 2) {
      const aStart = a.planStartTime ? timestampDate(a.planStartTime).getTime() : 0;
      const bStart = b.planStartTime ? timestampDate(b.planStartTime).getTime() : 0;
      return bStart - aStart;
    }

    // Within tier 3 or 4: update_time desc
    const aUpdate = a.updateTime ? timestampDate(a.updateTime).getTime() : 0;
    const bUpdate = b.updateTime ? timestampDate(b.updateTime).getTime() : 0;
    return bUpdate - aUpdate;
  });
}

export const useMemoSorting = (options: UseMemoSortingOptions = {}): UseMemoSortingResult => {
  const { pinnedFirst = false, state = State.NORMAL } = options;
  const { orderByTimeAsc, timeBasis } = useView();

  // Generate orderBy string for API
  const orderBy = useMemo(() => {
    const basis = timeBasis === "smart" ? "update_time" : timeBasis;
    const timeOrder = orderByTimeAsc ? `${basis} asc` : `${basis} desc`;
    return pinnedFirst ? `pinned desc, ${timeOrder}` : timeOrder;
  }, [pinnedFirst, orderByTimeAsc, timeBasis]);

  // Generate listSort function for client-side sorting
  const listSort = useMemo(() => {
    if (timeBasis === "smart") {
      return (memos: Memo[]): Memo[] => smartSort([...memos], pinnedFirst);
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
  }, [pinnedFirst, state, orderByTimeAsc, timeBasis]);

  return { listSort, orderBy };
};
