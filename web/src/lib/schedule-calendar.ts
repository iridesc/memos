import { timestampDate } from "@bufbuild/protobuf/wkt";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/** Build a local-date calendar, respecting the instance's first weekday. */
export function calendarDays(anchor: Date, weekStart: number): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -((first.getDay() - weekStart + 7) % 7));
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const length = Math.ceil((((first.getDay() - weekStart + 7) % 7) + last.getDate()) / 7) * 7;
  return Array.from({ length }, (_, index) => addDays(start, index));
}

export function moveCalendar(anchor: Date, direction: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

/** Count a memo once on each local date its plan interval touches, including its deadline date. */
export function groupScheduledMemos(memos: Memo[], days: Date[]): Map<string, Memo[]> {
  const groups = new Map(days.map((day) => [dateKey(day), [] as Memo[]]));
  const seen = new Set<string>();
  for (const memo of memos) {
    if (seen.has(memo.name) || !memo.planStartTime || !memo.planEndTime) continue;
    seen.add(memo.name);
    const start = timestampDate(memo.planStartTime).getTime();
    const end = timestampDate(memo.planEndTime).getTime();
    if (end < start) continue;
    for (const day of days) {
      if (start < addDays(day, 1).getTime() && end >= day.getTime()) groups.get(dateKey(day))?.push(memo);
    }
  }
  for (const items of groups.values()) {
    items.sort(
      (a, b) => timestampDate(a.planStartTime!).getTime() - timestampDate(b.planStartTime!).getTime() || a.name.localeCompare(b.name),
    );
  }
  return groups;
}

export function calendarHeat(count: number): number {
  return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
}
