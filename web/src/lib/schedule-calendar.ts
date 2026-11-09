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

/**
 * Build the seven local dates of the week that contains the anchor date.
 *
 * The week starts on the instance's configured first weekday, matching the
 * column order of the month grid so both views line up.
 */
export function calendarWeekDays(anchor: Date, weekStart: number): Date[] {
  const start = addDays(anchor, -((anchor.getDay() - weekStart + 7) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Move the anchor by whole weeks, staying on the local date grid. */
export function moveWeek(anchor: Date, direction: number): Date {
  return addDays(anchor, direction * 7);
}

/** Format a date for the day dialog title, e.g. "2026年11月9日 星期一". */
export function formatLongDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
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

/**
 * Removes the given tag tokens (`#tag`) from memo content so callers can render a
 * plain-text preview without duplicating the tags that are displayed as chips.
 *
 * Only the tags reported by the server are removed, so plain text such as
 * `#123` in the middle of a sentence is left untouched.
 */
export function stripTagsFromPreview(content: string, tags: readonly string[] | null | undefined): string {
  if (!tags || tags.length === 0) {
    return content.trim();
  }
  // Longest first so that "#a/b" is removed before "#a" can eat its prefix.
  const ordered = [...tags].sort((a, b) => b.length - a.length);
  let result = content;
  for (const tag of ordered) {
    result = result.split(`#${tag}`).join("");
  }
  return result
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function calendarHeat(count: number): number {
  return count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
}
