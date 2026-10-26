import { useCallback, useMemo } from "react";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useMemoFilters } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { planMemoMove } from "@/lib/today-order";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

const Today = () => {
  const user = useCurrentUser();
  const updateMemo = useUpdateMemo();

  // Build today filter: show memos whose time range overlaps with today,
  // plus expired memos (plan_end_ts before today) that need re-planning.
  const todayFilter = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startTs = Math.floor(startOfDay.getTime() / 1000);
    const endTs = Math.floor(endOfDay.getTime() / 1000);
    return `(plan_start_ts < ${endTs} && plan_end_ts >= ${startTs}) || plan_end_ts < ${startTs}`;
  }, []);

  const userFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: false,
    includePinned: false,
  });

  const combinedFilter = useMemo(() => {
    if (userFilter) {
      return `(${todayFilter}) && (${userFilter})`;
    }
    return todayFilter;
  }, [todayFilter, userFilter]);

  // Keep the explicit Today sequence on the server.
  const orderBy = "today_order";

  const handleReorder = useCallback(
    async (_fromIndex: number, toIndex: number, _memo: Memo, reordered: Memo[]) => {
      const updates = planMemoMove(reordered, toIndex);
      const saved: Memo[] = [];
      try {
        for (const { memo: item, key } of updates) {
          await updateMemo.mutateAsync({ update: { name: item.name, todayOrder: key }, updateMask: ["today_order"] });
          saved.push(item);
        }
      } catch (error) {
        // Initialization can touch older memos without keys. Restore successful writes on failure.
        for (const item of saved.reverse()) {
          await updateMemo.mutateAsync({ update: { name: item.name, todayOrder: item.todayOrder }, updateMask: ["today_order"] });
        }
        throw error;
      }
    },
    [updateMemo],
  );

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <PagedMemoList
        renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility showPinned compact />}
        orderBy={orderBy}
        filter={combinedFilter}
        showCreator
        showFilters={false}
        showMemoEditor
        editorCacheKey="today-memo-editor"
        onReorder={handleReorder}
        smartGroups={false}
      />
    </div>
  );
};

export default Today;
