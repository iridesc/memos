import { useMemo } from "react";
import MemoListTabs from "@/components/MemoListTabs/MemoListTabs";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useInstance } from "@/contexts/InstanceContext";
import { useMemoFilters } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { buildMemoListTabQuery, combineFilters, useMemoListTab } from "@/hooks/useMemoListTab";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

const Home = () => {
  const t = useTranslate();
  const user = useCurrentUser();
  const { isInitialized } = useInstance();
  const { tab, nowTs, plannedOrder, selectTab, setPlannedOrder } = useMemoListTab();

  const memoFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: true,
    includePinned: true,
  });

  // The tab supplies the state/plan bucket; the user's filters (search, tag, shortcut) narrow it further.
  const { filter, orderBy } = useMemo(() => {
    const tabQuery = buildMemoListTabQuery(tab, nowTs, plannedOrder);
    return { filter: combineFilters(tabQuery.filter, memoFilter), orderBy: tabQuery.orderBy };
  }, [tab, nowTs, plannedOrder, memoFilter]);

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <MemoListTabs value={tab} onChange={selectTab} plannedOrder={plannedOrder} onPlannedOrderChange={setPlannedOrder} />
      <PagedMemoList
        renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility showPinned compact />}
        orderBy={orderBy}
        filter={filter}
        enabled={isInitialized}
        showMemoEditor={tab === "all" || tab === "unscheduled"}
        splitCompleted={false}
        emptyMessage={t(`message.tab-empty-${tab}`)}
      />
    </div>
  );
};

export default Home;
