import { useCallback, useMemo } from "react";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useMemoFilters } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { computeReorderKey } from "@/lib/today-order";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";

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

  // Server-side smart sort: expired → planned → completed.
  // Within expired: most overdue first. Within planned: earliest start first.
  // Unscheduled memos (no plan times) are excluded from today view.
  // No client-side sort needed — server handles tiered ordering.
  const orderBy = "today_order";

  // Handle drag-and-drop reorder: compute new plan times based on neighbors.
  const handleReorder = useCallback(
    (_fromIndex: number, _toIndex: number, memo: Memo, reordered: Memo[]) => {
      const newIndex = reordered.findIndex((m) => m.name === memo.name);
      if (newIndex === -1) return;

      const prev = newIndex > 0 ? reordered[newIndex - 1] : null;
      const next = newIndex < reordered.length - 1 ? reordered[newIndex + 1] : null;

      const prevOrder = (prev as { todayOrder?: string })?.todayOrder ?? null;
      const nextOrder = (next as { todayOrder?: string })?.todayOrder ?? null;

      const { key } = computeReorderKey(prevOrder, nextOrder);
      const update = { name: memo.name, todayOrder: key };
      updateMemo.mutateAsync({
        update: update as Partial<Memo>,
        updateMask: ["today_order"],
      });
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
        draggable
        onReorder={handleReorder}
        smartGroups={false}
      />
    </div>
  );
};

export default Today;
