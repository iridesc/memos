import { Button } from "@/components/ui/button";
import { MEMO_LIST_TABS, type MemoListTab, type PlannedTabOrder } from "@/hooks/useMemoListTab";
import { useTranslate } from "@/utils/i18n";

interface Props {
  value: MemoListTab;
  onChange: (tab: MemoListTab) => void;
  plannedOrder: PlannedTabOrder;
  onPlannedOrderChange: (order: PlannedTabOrder) => void;
}

const TAB_LABEL_KEYS = {
  all: "common.tab-all",
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

/**
 * Top-level switch between the memo buckets of the home page:
 * all / unscheduled / expired / planned / completed.
 * Styled to match the schedule view switcher on the calendar page.
 */
const MemoListTabs = ({ value, onChange, plannedOrder, onPlannedOrderChange }: Props) => {
  const t = useTranslate();

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-2 py-3">
      <div className="inline-flex overflow-x-auto rounded-lg border bg-muted/40 p-1" role="tablist" aria-label={t("common.tab-list-type")}>
        {MEMO_LIST_TABS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={item === value ? "secondary" : "ghost"}
            role="tab"
            aria-selected={item === value}
            onClick={() => onChange(item)}
          >
            {t(TAB_LABEL_KEYS[item])}
          </Button>
        ))}
      </div>
      {value === "planned" && (
        <div className="inline-flex shrink-0 rounded-lg border bg-muted/40 p-1" role="group" aria-label={t("common.sort-by")}>
          {ORDER_OPTIONS.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={option === plannedOrder ? "secondary" : "ghost"}
              aria-pressed={option === plannedOrder}
              onClick={() => onPlannedOrderChange(option)}
            >
              {t(ORDER_LABEL_KEYS[option])}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoListTabs;
