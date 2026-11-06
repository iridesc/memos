import { useCallback, useState } from "react";

/** Top-level tabs of the home memo list. Each tab maps to a server-side filter. */
export type MemoListTab = "all" | "unscheduled" | "expired" | "planned" | "completed";

/** Secondary ordering basis for the "planned" tab. */
export type PlannedTabOrder = "plan_start_time" | "plan_end_time";

export const MEMO_LIST_TABS: MemoListTab[] = ["all", "unscheduled", "expired", "planned", "completed"];

const TAB_STORAGE_KEY = "memos-home-tab";

export interface MemoListTabQuery {
  filter: string;
  orderBy: string;
}

const isMemoListTab = (value: string): value is MemoListTab => (MEMO_LIST_TABS as readonly string[]).includes(value);

/**
 * Build the server-side filter and ordering for a tab.
 *
 * Every tab scopes itself with `state`, so the request does not rely on the
 * backend's implicit "NORMAL returns NORMAL + COMPLETED" behaviour.
 */
export const buildMemoListTabQuery = (
  tab: MemoListTab,
  nowTs: number,
  plannedOrder: PlannedTabOrder = "plan_start_time",
): MemoListTabQuery => {
  switch (tab) {
    case "all":
      return {
        filter: 'state != "ARCHIVED"',
        orderBy: "pinned desc, create_time desc",
      };
    case "unscheduled":
      return {
        filter: 'state == "NORMAL" && has_plan == false',
        orderBy: "pinned desc, update_time desc",
      };
    case "expired":
      return {
        filter: `state == "NORMAL" && plan_end_ts < ${nowTs}`,
        orderBy: "pinned desc, plan_end_time asc",
      };
    case "planned":
      return {
        filter: `state == "NORMAL" && plan_end_ts >= ${nowTs}`,
        orderBy: `pinned desc, ${plannedOrder} asc`,
      };
    case "completed":
      return {
        filter: 'state == "COMPLETED"',
        orderBy: "pinned desc, completed_time desc",
      };
  }
};

/** Join several CEL filters with `&&`, wrapping each part in parentheses. */
export const combineFilters = (...filters: (string | undefined)[]): string | undefined => {
  const parts = filters.filter((filter): filter is string => Boolean(filter && filter.trim() !== ""));
  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return parts.map((part) => `(${part})`).join(" && ");
};

const readStoredTab = (): MemoListTab => {
  try {
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored && isMemoListTab(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return "all";
};

export interface UseMemoListTabResult {
  tab: MemoListTab;
  /** Unix epoch used as "now" for the expired/planned split. */
  nowTs: number;
  plannedOrder: PlannedTabOrder;
  selectTab: (tab: MemoListTab) => void;
  setPlannedOrder: (order: PlannedTabOrder) => void;
}

/** Tab selection for the home list, persisted to localStorage. */
export const useMemoListTab = (): UseMemoListTabResult => {
  const [tab, setTab] = useState<MemoListTab>(readStoredTab);
  const [plannedOrder, setPlannedOrder] = useState<PlannedTabOrder>("plan_start_time");
  // Recompute "now" on every tab switch so expiring memos move to the right tab.
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));

  const selectTab = useCallback((next: MemoListTab) => {
    setTab(next);
    setNowTs(Math.floor(Date.now() / 1000));
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  return { tab, nowTs, plannedOrder, selectTab, setPlannedOrder };
};
