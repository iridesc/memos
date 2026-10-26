import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";

/** Compute updates for a move, initializing missing or inconsistent legacy keys when needed. */
export function planMemoMove(reordered: Memo[], index: number): { memo: Memo; key: string }[] {
  const original = [...reordered];
  const [moved] = original.splice(index, 1);
  // Only neighbors need to be ordered; the moved item receives its new key below.
  let previous: string | null = null;
  try {
    for (const memo of original) {
      if (!memo.todayOrder || (previous !== null && memo.todayOrder <= previous)) throw new Error("Uninitialized order");
      generateKeyBetween(memo.todayOrder, null); // Validate legacy keys before using them.
      previous = memo.todayOrder;
    }
    const prev = reordered[index - 1]?.todayOrder || null;
    const next = reordered[index + 1]?.todayOrder || null;
    return [{ memo: moved, key: generateKeyBetween(prev, next) }];
  } catch {
    const keys = generateNKeysBetween(null, null, reordered.length);
    return reordered.flatMap((memo, i) => (memo.todayOrder === keys[i] ? [] : [{ memo, key: keys[i] }]));
  }
}
