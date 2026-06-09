import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import { useInstance } from "@/contexts/InstanceContext";
import { useView } from "@/contexts/ViewContext";
import { useMemoFilters, useMemoSorting } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { State } from "@/types/proto/api/v1/common_pb";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";

const Home = () => {
  const user = useCurrentUser();
  const { isInitialized } = useInstance();
  const { timeBasis } = useView();

  const memoFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: true,
    includePinned: true,
  });

  const { listSort, orderBy } = useMemoSorting({
    pinnedFirst: true,
    state: State.NORMAL,
  });

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <PagedMemoList
        renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.updateTime}`} memo={memo} showVisibility showPinned compact />}
        listSort={listSort}
        orderBy={orderBy}
        filter={memoFilter}
        enabled={isInitialized}
        showMemoEditor
        smartGroups={timeBasis === "smart"}
      />
    </div>
  );
};

export default Home;
