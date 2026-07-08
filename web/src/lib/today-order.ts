import { generateKeyBetween } from "fractional-indexing";

export interface ReorderResult {
  key: string;
  needsRebalance: boolean;
}

export function computeReorderKey(prevOrder: string | null, nextOrder: string | null): ReorderResult {
  const key = generateKeyBetween(prevOrder, nextOrder);
  return { key, needsRebalance: key === prevOrder || key === nextOrder };
}

export { generateKeyBetween } from "fractional-indexing";
