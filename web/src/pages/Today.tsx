import { timestampDate } from "@bufbuild/protobuf/wkt";
import { useCallback, useMemo } from "react";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useMemoFilters } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUpdateMemo } from "@/hooks/useMemoQueries";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";

const Today = () => {
  const user = useCurrentUser();
  const updateMemo = useUpdateMemo();

  // Build today filter: show memos whose time range overlaps with today.
  const todayFilter = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startTs = Math.floor(startOfDay.getTime() / 1000);
    const endTs = Math.floor(endOfDay.getTime() / 1000);
    return `plan_start_ts < ${endTs} && plan_end_ts >= ${startTs}`;
  }, []);

  const userFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: false,
    includePinned: false,
  });

  const combinedFilter = useMemo(() => {
    if (userFilter) {
      return `${todayFilter} && (${userFilter})`;
    }
    return todayFilter;
  }, [todayFilter, userFilter]);

  // Sort: expired memos first (plan_end_time < now), then by plan_start_time ascending.
  // Within expired group, plan_end_time asc puts the most overdue first.
  // Within active group, plan_start_time asc keeps drag-and-drop reorder working correctly.
  const orderBy = "plan_end_time asc";
  const listSort = useCallback((memos: Memo[]): Memo[] => {
    const now = new Date().getTime();
    return [...memos].sort((a, b) => {
      const aExpired = timestampDate(a.planEndTime!).getTime() < now;
      const bExpired = timestampDate(b.planEndTime!).getTime() < now;
      // Expired memos first
      if (aExpired !== bExpired) return aExpired ? -1 : 1;
      // Within expired group: plan_end_time asc (most overdue first)
      if (aExpired) {
        return timestampDate(a.planEndTime!).getTime() - timestampDate(b.planEndTime!).getTime();
      }
      // Within active group: plan_start_time asc
      return timestampDate(a.planStartTime!).getTime() - timestampDate(b.planStartTime!).getTime();
    });
  }, []);

  // Handle drag-and-drop reorder: compute new plan times based on neighbors.
  const handleReorder = useCallback(
    (_fromIndex: number, toIndex: number, memo: Memo, reordered: Memo[]) => {
      const prev = toIndex > 0 ? reordered[toIndex - 1] : undefined;
      const next = toIndex < reordered.length - 1 ? reordered[toIndex + 1] : undefined;

      const prevStart = prev?.planStartTime ? timestampDate(prev.planStartTime).getTime() : 0;
      const nextStart = next?.planStartTime ? timestampDate(next.planStartTime).getTime() : 0;

      const oldStart = memo.planStartTime ? timestampDate(memo.planStartTime).getTime() : Date.now();
      const oldEnd = memo.planEndTime ? timestampDate(memo.planEndTime).getTime() : Date.now() + 60 * 60 * 1000;
      const oldDuration = oldEnd - oldStart;

      let newStartMs: number;
      if (prevStart && nextStart) {
        newStartMs = Math.round((prevStart + nextStart) / 2);
      } else if (!prevStart && nextStart) {
        newStartMs = nextStart - 5 * 60 * 1000;
      } else if (prevStart && !nextStart) {
        newStartMs = prevStart + 30 * 60 * 1000;
      } else {
        newStartMs = Date.now() + 5 * 60 * 1000;
      }

      const newStartSec = Math.floor(newStartMs / 1000);
      const newEndSec = Math.floor((newStartMs + oldDuration) / 1000);

      updateMemo.mutateAsync({
        update: {
          name: memo.name,
          planStartTime: { seconds: BigInt(newStartSec), nanos: 0 },
          planEndTime: { seconds: BigInt(newEndSec), nanos: 0 },
        } as Partial<Memo>,
        updateMask: ["plan_start_time", "plan_end_time"],
      });
    },
    [updateMemo],
  );

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <PagedMemoList
        renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility showPinned compact />}
        listSort={listSort}
        orderBy={orderBy}
        filter={combinedFilter}
        showCreator
        showFilters={false}
        showMemoEditor
        editorCacheKey="today-memo-editor"
        draggable
        onReorder={handleReorder}
      />
    </div>
  );
};

export default Today;
