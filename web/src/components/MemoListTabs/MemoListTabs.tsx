import { MEMO_LIST_TABS, type MemoListTab, type PlannedTabOrder } from "@/hooks/useMemoListTab";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";

interface Props {
  value: MemoListTab;
  onChange: (tab: MemoListTab) => void;
  plannedOrder: PlannedTabOrder;
  onPlannedOrderChange: (order: PlannedTabOrder) => void;
}

const TAB_LABEL_KEYS = {
  unscheduled: "common.tab-unscheduled",
  expired: "common.tab-expired",
  planned: "common.tab-planned",
  completed: "common.tab-completed",
} as const;

const ORDER_LABEL_KEYS = {
  plan_start_time: "common.sort-by-plan-start",
  plan_end_time: "common.sort-by-plan-end",
} as const;

const ORDER_OPTIONS: PlannedTabOrder[] = ["plan_start_time", "plan_end_time"];

const tabClass = (active: boolean) =>
  cn(
    "whitespace-nowrap rounded-md px-3 py-1 text-sm transition-colors",
    active ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground",
  );

/**
 * Top-level switch between the four memo buckets of the home page:
 * unscheduled / expired / planned / completed.
 */
const MemoListTabs = ({ value, onChange, plannedOrder, onPlannedOrderChange }: Props) => {
  const t = useTranslate();

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-2 pt-2">
      <div className="inline-flex overflow-x-auto rounded-lg border bg-muted/40 p-1" role="tablist" aria-label={t("common.tab-list-type")}>
        {MEMO_LIST_TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === value}
            className={tabClass(item === value)}
            onClick={() => onChange(item)}
          >
            {t(TAB_LABEL_KEYS[item])}
          </button>
        ))}
      </div>
      {value === "planned" && (
        <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1" role="group" aria-label={t("common.sort-by")}>
          {ORDER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === plannedOrder}
              className={tabClass(option === plannedOrder)}
              onClick={() => onPlannedOrderChange(option)}
            >
              {t(ORDER_LABEL_KEYS[option])}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoListTabs;
