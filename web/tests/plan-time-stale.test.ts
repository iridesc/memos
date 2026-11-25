import { create } from "@bufbuild/protobuf";
import { timestampDate, timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it, vi } from "vitest";
import { memoService } from "@/components/MemoEditor/services/memoService";
import { editorActions } from "@/components/MemoEditor/state/actions";
import { editorReducer } from "@/components/MemoEditor/state/reducer";
import { initialState } from "@/components/MemoEditor/state/types";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const mocks = vi.hoisted(() => ({ getMemo: vi.fn(), updateMemo: vi.fn(), createMemo: vi.fn(), createMemoComment: vi.fn() }));
vi.mock("@/connect", () => ({ memoServiceClient: mocks }));

const buildState = (planStartTime?: Date, planEndTime?: Date) => {
  const memo = create(MemoSchema, {
    name: "memos/new",
    content: "hello",
    planStartTime: planStartTime ? timestampFromDate(planStartTime) : undefined,
    planEndTime: planEndTime ? timestampFromDate(planEndTime) : undefined,
  });
  return editorReducer(initialState, editorActions.initMemo(memoService.fromMemo(memo)));
};

describe("saving a memo whose plan window went stale", () => {
  it("moves a window that already started forward to the current time", async () => {
    const now = new Date();
    const staleStart = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const staleEnd = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    mocks.createMemo.mockImplementation(async ({ memo }: { memo: { planStartTime?: unknown; planEndTime?: unknown } }) => ({
      name: "memos/new",
      planStartTime: memo.planStartTime,
      planEndTime: memo.planEndTime,
    }));

    const state = buildState(staleStart, staleEnd);
    const result = await memoService.save(state, {});

    expect(result.planTimeShifted).toBe(true);
    const sent = mocks.createMemo.mock.calls[0][0].memo;
    const sentStart = timestampDate(sent.planStartTime as never);
    const sentEnd = timestampDate(sent.planEndTime as never);
    expect(sentStart.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(sentEnd.getTime()).toBeGreaterThan(sentStart.getTime());
  });

  it("keeps a window that has not started yet", async () => {
    const now = new Date();
    const planStartTime = new Date(now.getTime() + 60 * 60 * 1000);
    const planEndTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    mocks.createMemo.mockImplementation(async ({ memo }: { memo: unknown }) => ({ name: "memos/new", ...(memo as object) }));

    const state = buildState(planStartTime, planEndTime);
    const result = await memoService.save(state, {});

    expect(result.planTimeShifted).toBe(false);
    const sent = mocks.createMemo.mock.calls[0][0].memo;
    expect(timestampDate(sent.planStartTime as never).getTime()).toBe(planStartTime.getTime());
    expect(timestampDate(sent.planEndTime as never).getTime()).toBe(planEndTime.getTime());
  });

  it("leaves a memo without plan time alone", async () => {
    mocks.createMemo.mockImplementation(async ({ memo }: { memo: unknown }) => ({ name: "memos/new", ...(memo as object) }));

    const state = buildState(undefined, undefined);
    const result = await memoService.save(state, {});

    expect(result.planTimeShifted).toBe(false);
    const sent = mocks.createMemo.mock.calls[0][0].memo;
    expect(sent.planStartTime).toBeUndefined();
    expect(sent.planEndTime).toBeUndefined();
  });
});
