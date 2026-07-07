import { timestampDate } from "@bufbuild/protobuf/wkt";
import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Fragment, type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MentionResolutionProvider } from "@/components/MemoContent/MentionResolutionContext";
import { deriveDefaultCreateTimeFromFilters } from "@/components/MemoEditor/utils/deriveDefaultCreateTime";
import { Button } from "@/components/ui/button";
import { userServiceClient } from "@/connect";
import { useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { DEFAULT_LIST_MEMOS_PAGE_SIZE } from "@/helpers/consts";
import { useInfiniteMemos } from "@/hooks/useMemoQueries";
import { userKeys } from "@/hooks/useUserQueries";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import MemoEditor from "../MemoEditor";
import MemoFilters from "../MemoFilters";
import Placeholder from "../Placeholder";
import Skeleton from "../Skeleton";
import { ListEditBridge, ListEditProvider } from "./ListEditContext";

interface Props {
  renderer: (memo: Memo) => ReactElement;
  listSort?: (list: Memo[]) => Memo[];
  state?: State;
  orderBy?: string;
  filter?: string;
  pageSize?: number;
  showCreator?: boolean;
  enabled?: boolean;
  showFilters?: boolean;
  /** When true, render the inline MemoEditor above the list (e.g. on the Home page). */
  showMemoEditor?: boolean;
  editorCacheKey?: string;
  draggable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number, memo: Memo, reordered: Memo[]) => void;
  /** When true, insert visual group separators between smart-sort tiers (expired / planned / unscheduled). */
  smartGroups?: boolean;
}

const COMPLETED_COLLAPSED_KEY = "memos-completed-collapsed";

function useAutoFetchWhenNotScrollable({
  hasNextPage,
  isFetchingNextPage,
  memoCount,
  onFetchNext,
}: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  memoCount: number;
  onFetchNext: () => Promise<unknown>;
}) {
  const autoFetchTimeoutRef = useRef<number | null>(null);

  const isPageScrollable = useCallback(() => {
    const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    return documentHeight > window.innerHeight + 100;
  }, []);

  const checkAndFetchIfNeeded = useCallback(async () => {
    if (autoFetchTimeoutRef.current) {
      clearTimeout(autoFetchTimeoutRef.current);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    const shouldFetch = !isPageScrollable() && hasNextPage && !isFetchingNextPage && memoCount > 0;

    if (shouldFetch) {
      await onFetchNext();

      autoFetchTimeoutRef.current = window.setTimeout(() => {
        void checkAndFetchIfNeeded();
      }, 500);
    }
  }, [hasNextPage, isFetchingNextPage, memoCount, isPageScrollable, onFetchNext]);

  useEffect(() => {
    if (!isFetchingNextPage && memoCount > 0) {
      void checkAndFetchIfNeeded();
    }
  }, [memoCount, isFetchingNextPage, checkAndFetchIfNeeded]);

  useEffect(() => {
    return () => {
      if (autoFetchTimeoutRef.current) {
        clearTimeout(autoFetchTimeoutRef.current);
      }
    };
  }, []);
}

const PagedMemoList = (props: Props) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { filters } = useMemoFilterContext();

  // Track whether any MemoEditor in this list has non-empty content, to disable drag-and-drop.
  // Uses ListEditProvider context + bridge so both the inline editor and in-place memo editors can report.
  const [isEditing, setIsEditing] = useState(false);

  const showMemoEditor = props.showMemoEditor ?? false;
  const defaultCreateTime = useMemo(() => deriveDefaultCreateTimeFromFilters(filters), [filters]);
  const isTodayEditor = props.editorCacheKey === "today-memo-editor";
  const defaultPlanTimes = (() => {
    if (!isTodayEditor) return undefined;
    const now = new Date();
    const nextMin = Math.ceil((now.getMinutes() + 5) / 5) * 5;
    let startH = now.getHours();
    let startM = nextMin;
    if (startM >= 60) {
      startH += 1;
      startM -= 60;
    }
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 55, 0, 0);
    const end = todayEnd.getTime() - start.getTime() >= 60 * 60 * 1000 ? todayEnd : new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);
    return { planStartTime: start, planEndTime: end };
  })();

  const listState = props.state || State.NORMAL;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteMemos(
    {
      state: listState,
      orderBy: props.orderBy || "create_time desc",
      filter: props.filter,
      pageSize: props.pageSize || DEFAULT_LIST_MEMOS_PAGE_SIZE,
    },
    { enabled: props.enabled ?? true },
  );

  // Flatten pages into a single array of memos
  const memos = useMemo(() => data?.pages.flatMap((page) => page.memos) || [], [data]);

  // Apply custom sorting if provided
  const sortedMemoList = useMemo(() => (props.listSort ? props.listSort(memos) : memos), [memos, props.listSort]);

  // Split into active (NORMAL) and completed (COMPLETED) groups.
  // Only split when listState is NORMAL (default) — when explicitly filtering
  // for COMPLETED or ARCHIVED, don't split.
  const shouldSplit = listState === State.NORMAL;
  const activeMemos = useMemo(
    () => (shouldSplit ? sortedMemoList.filter((m) => m.state !== State.COMPLETED) : sortedMemoList),
    [sortedMemoList, shouldSplit],
  );
  const completedMemos = useMemo(() => {
    if (!shouldSplit) return [];
    return sortedMemoList
      .filter((m) => m.state === State.COMPLETED)
      .sort((a, b) => {
        const aTime = a.updateTime ? timestampDate(a.updateTime).getTime() : 0;
        const bTime = b.updateTime ? timestampDate(b.updateTime).getTime() : 0;
        return bTime - aTime; // Most recently completed first
      });
  }, [sortedMemoList, shouldSplit]);

  // Smart group separators: insert labels between tiers when in smart mode.
  const getSmartTier = useCallback((m: Memo): number => {
    if (m.state === State.COMPLETED) return 4;
    if (!m.planStartTime || !m.planEndTime) return 3;
    const now = new Date().getTime();
    if (timestampDate(m.planEndTime).getTime() < now) return 1;
    return 2;
  }, []);

  const GROUP_LABELS: Record<number, string> = {
    1: t("memo.group.expired"),
    2: t("memo.group.planned"),
    3: t("memo.group.unscheduled"),
  };

  type RenderItem = { key: string; kind: "memo"; memo: Memo } | { key: string; kind: "separator"; tier: number };

  const activeRenderItems: RenderItem[] = useMemo(() => {
    if (!props.smartGroups) return activeMemos.map((m) => ({ key: m.name, kind: "memo" as const, memo: m }));
    const items: RenderItem[] = [];
    let lastTier = -1;
    for (const m of activeMemos) {
      const tier = getSmartTier(m);
      if (tier !== lastTier && GROUP_LABELS[tier]) {
        items.push({ key: `sep-${tier}`, kind: "separator", tier });
      }
      items.push({ key: m.name, kind: "memo", memo: m });
      lastTier = tier;
    }
    return items;
  }, [activeMemos, props.smartGroups, getSmartTier, GROUP_LABELS]);

  // Drag-and-drop sensors.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Handle drag end: reorder active memos and call onReorder callback.
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = activeMemos.findIndex((m) => m.name === active.id);
      const newIndex = activeMemos.findIndex((m) => m.name === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const memo = activeMemos[oldIndex];
      const newItems = arrayMove(activeMemos, oldIndex, newIndex);
      props.onReorder?.(oldIndex, newIndex, memo, newItems);
    },
    [activeMemos, props],
  );

  // Completed section collapse state, persisted to localStorage.
  const [completedCollapsed, setCompletedCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COMPLETED_COLLAPSED_KEY) === "true";
    } catch {
      return true;
    }
  });

  const toggleCompleted = useCallback(() => {
    setCompletedCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COMPLETED_COLLAPSED_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Prefetch creators when new data arrives to improve performance
  useEffect(() => {
    if (!data?.pages || !props.showCreator) return;

    const lastPage = data.pages[data.pages.length - 1];
    if (!lastPage?.memos) return;

    const uniqueCreators = Array.from(new Set(lastPage.memos.map((memo) => memo.creator)));
    for (const creator of uniqueCreators) {
      void queryClient.prefetchQuery({
        queryKey: userKeys.detail(creator),
        queryFn: async () => {
          const user = await userServiceClient.getUser({ name: creator });
          return user;
        },
        staleTime: 1000 * 60 * 5,
      });
    }
  }, [data?.pages, props.showCreator, queryClient]);

  // Auto-fetch hook: fetches more content when page isn't scrollable
  useAutoFetchWhenNotScrollable({
    hasNextPage,
    isFetchingNextPage,
    memoCount: sortedMemoList.length,
    onFetchNext: fetchNextPage,
  });

  // Infinite scroll: fetch more when user scrolls near bottom
  useEffect(() => {
    if (!hasNextPage) return;

    const handleScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
      if (nearBottom && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const children = (
    <ListEditProvider>
      <ListEditBridge onChange={setIsEditing} />
      <MentionResolutionProvider contents={sortedMemoList.map((memo) => memo.content)}>
        <div className="flex flex-col justify-start w-full max-w-2xl mx-auto">
          {/* Show skeleton loader during initial load */}
          {isLoading ? (
            <Skeleton showCreator={props.showCreator} count={4} />
          ) : (
            <>
              {showMemoEditor ? (
                <MemoEditor
                  className="mb-2"
                  cacheKey={props.editorCacheKey || "home-memo-editor"}
                  placeholder={t("editor.any-thoughts")}
                  defaultCreateTime={defaultCreateTime}
                  defaultPlanTimes={defaultPlanTimes}
                />
              ) : null}
              {props.showFilters !== false && <MemoFilters />}
              {props.draggable ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={activeMemos.map((m) => m.name)} strategy={verticalListSortingStrategy}>
                    {activeRenderItems.map((item) =>
                      item.kind === "memo" ? (
                        <SortableMemoItem key={item.key} id={item.memo.name} disabled={isEditing}>
                          {props.renderer(item.memo)}
                        </SortableMemoItem>
                      ) : (
                        <div key={item.key} className="px-2 pt-3 pb-1 text-xs text-muted-foreground">
                          {GROUP_LABELS[item.tier]}
                        </div>
                      ),
                    )}
                  </SortableContext>
                </DndContext>
              ) : (
                activeRenderItems.map((item) =>
                  item.kind === "memo" ? (
                    <Fragment key={item.key}>{props.renderer(item.memo)}</Fragment>
                  ) : (
                    <div key={item.key} className="px-2 pt-3 pb-1 text-xs text-muted-foreground">
                      {GROUP_LABELS[item.tier]}
                    </div>
                  ),
                )
              )}

              {/* Completed section (collapsible) */}
              {shouldSplit && completedMemos.length > 0 && (
                <div className="mt-2 mb-2">
                  <button
                    type="button"
                    className="w-full flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                    onClick={toggleCompleted}
                  >
                    {completedCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                    <span>{t("common.completed-count", { count: completedMemos.length })}</span>
                  </button>
                  {!completedCollapsed && <div className="mt-1">{completedMemos.map((memo) => props.renderer(memo))}</div>}
                </div>
              )}

              {/* Loading indicator for pagination */}
              {isFetchingNextPage && <Skeleton showCreator={props.showCreator} count={2} />}

              {/* Empty state or back-to-top button */}
              {!isFetchingNextPage && (
                <>
                  {!hasNextPage && sortedMemoList.length === 0 ? (
                    <Placeholder variant="empty" message={t("message.no-data")} />
                  ) : (
                    <div className="w-full opacity-70 flex flex-row justify-center items-center my-4">
                      <BackToTop />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </MentionResolutionProvider>
    </ListEditProvider>
  );

  return children;
};

const BackToTop = () => {
  const t = useTranslate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 400;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <Button variant="ghost" onClick={scrollToTop}>
      {t("router.back-to-top")}
      <ArrowUpIcon className="ml-1 w-4 h-auto" />
    </Button>
  );
};

const SortableMemoItem: React.FC<{ id: string; disabled?: boolean; children: React.ReactNode }> = ({ id, disabled, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: "relative",
    cursor: disabled ? undefined : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(disabled ? {} : listeners)}>
      {children}
    </div>
  );
};

export default PagedMemoList;
