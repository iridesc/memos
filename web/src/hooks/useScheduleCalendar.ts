import { useQuery } from "@tanstack/react-query";
import { memoServiceClient } from "@/connect";
import { buildMemoCreatorFilter } from "@/helpers/resource-names";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { memoKeys } from "./useMemoQueries";

/** Load every matching page before publishing calendar counts. */
export function useScheduleCalendar(userName: string | undefined, start: Date, end: Date, enabled = true) {
  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);
  const filter = `(${buildMemoCreatorFilter(userName || "")}) && plan_start_ts < ${endTs} && plan_end_ts >= ${startTs}`;
  return useQuery({
    queryKey: [...memoKeys.lists(), "calendar", userName, startTs, endTs],
    enabled: !!userName && enabled,
    queryFn: async ({ signal }) => {
      const memos: Memo[] = [];
      let pageToken = "";
      do {
        const page = await memoServiceClient.listMemos(
          { filter, state: State.NORMAL, orderBy: "plan_start_time asc", pageSize: 200, pageToken },
          { signal },
        );
        memos.push(...page.memos);
        pageToken = page.nextPageToken;
      } while (pageToken);
      return { memos };
    },
  });
}
