import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import { planMemoMove } from "@/lib/today-order";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const memo = (name: string, todayOrder = "") => create(MemoSchema, { name, todayOrder });

describe("Today menu ordering", () => {
  it.each([
    { names: ["b", "a", "c"], index: 0 },
    { names: ["a", "c", "b"], index: 1 },
    { names: ["a", "c", "b"], index: 2 },
  ])("persists a move at position $index using one update", ({ names, index }) => {
    const original = [memo("a", "a0"), memo("b", "a1"), memo("c", "a2")];
    const reordered = names.map((name) => original.find((item) => item.name === name)!);
    const changes = planMemoMove(reordered, index);
    expect(changes).toHaveLength(1);
    const saved = original.map((item) => ({
      ...item,
      todayOrder: changes.find((update) => update.memo.name === item.name)?.key ?? item.todayOrder,
    }));
    expect(saved.sort((a, b) => (a.todayOrder < b.todayOrder ? -1 : 1)).map((item) => item.name)).toEqual(names);
    expect(original.map((item) => item.todayOrder)).toEqual(["a0", "a1", "a2"]);
  });

  it.each([
    ["", "", ""],
    ["a0", "a0", "a1"],
    ["invalid", "a0", "a1"],
  ])("repairs legacy keys %j", (...keys) => {
    const reordered = [memo("b", keys[0]), memo("a", keys[1]), memo("c", keys[2])];
    const changes = planMemoMove(reordered, 0);
    const savedKeys = reordered.map((item) => changes.find((update) => update.memo.name === item.name)?.key ?? item.todayOrder);
    expect(savedKeys.every(Boolean)).toBe(true);
    expect(new Set(savedKeys).size).toBe(3);
    expect([...savedKeys].sort()).toEqual(savedKeys);
  });
});
