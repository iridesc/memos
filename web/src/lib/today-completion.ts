import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

/** Whether a completed memo was last updated during the supplied local day. */
export function isMemoCompletedOnDay(memo: Memo, day: Date): boolean {
  if (!memo.updateTime) return false;
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  const completedAt = timestampDate(memo.updateTime).getTime();
  return completedAt >= start && completedAt < end;
}
