import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { isMemoCompletedOnDay } from "@/lib/today-completion";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const memo = (time?: Date) => create(MemoSchema, { name: "memos/test", updateTime: time ? timestampFromDate(time) : undefined });

describe("today completed memos", () => {
  it("includes only memos completed within the local day", () => {
    const day = new Date(2026, 9, 27, 12);
    expect(isMemoCompletedOnDay(memo(new Date(2026, 9, 27, 0, 0)), day)).toBe(true);
    expect(isMemoCompletedOnDay(memo(new Date(2026, 9, 27, 23, 59, 59)), day)).toBe(true);
    expect(isMemoCompletedOnDay(memo(new Date(2026, 9, 26, 23, 59, 59)), day)).toBe(false);
    expect(isMemoCompletedOnDay(memo(new Date(2026, 9, 28, 0, 0)), day)).toBe(false);
    expect(isMemoCompletedOnDay(memo(), day)).toBe(false);
  });
});
