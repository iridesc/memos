import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it, vi } from "vitest";
import { memoService } from "@/components/MemoEditor/services/memoService";
import { editorActions } from "@/components/MemoEditor/state/actions";
import { editorReducer } from "@/components/MemoEditor/state/reducer";
import { initialState } from "@/components/MemoEditor/state/types";
import { MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const mocks = vi.hoisted(() => ({ getMemo: vi.fn(), updateMemo: vi.fn() }));
vi.mock("@/connect", () => ({ memoServiceClient: mocks }));

const PLAN_START = new Date(2026, 10, 6, 22, 36, 1);
const PLAN_END = new Date(2026, 10, 6, 23, 59, 59);

const buildMemo = () =>
  create(MemoSchema, {
    name: "memos/abc",
    content: "hello",
    planStartTime: timestampFromDate(PLAN_START),
    planEndTime: timestampFromDate(PLAN_END),
  });

describe("clearing the plan time", () => {
  it("sends both plan time paths in the update mask so the server clears them", async () => {
    const memo = buildMemo();
    mocks.getMemo.mockResolvedValue(memo);
    mocks.updateMemo.mockImplementation(async ({ memo: updated }: { memo: unknown }) => updated);

    let state = editorReducer(initialState, editorActions.initMemo(memoService.fromMemo(memo)));
    state = editorReducer(state, editorActions.setTimestamps({ planStartTime: undefined, planEndTime: undefined }));

    const result = await memoService.save(state, { memoName: "memos/abc" });

    expect(result.hasChanges).toBe(true);
    expect(mocks.updateMemo).toHaveBeenCalledOnce();
    const paths = mocks.updateMemo.mock.calls[0][0].updateMask.paths;
    expect(paths).toContain("plan_start_time");
    expect(paths).toContain("plan_end_time");
  });

  it("sends nothing when the plan times are unchanged", async () => {
    const memo = buildMemo();
    mocks.getMemo.mockResolvedValue(memo);
    mocks.updateMemo.mockImplementation(async ({ memo: updated }: { memo: unknown }) => updated);

    const state = editorReducer(initialState, editorActions.initMemo(memoService.fromMemo(memo)));

    const result = await memoService.save(state, { memoName: "memos/abc" });

    expect(result.hasChanges).toBe(false);
    expect(mocks.updateMemo).not.toHaveBeenCalled();
  });
});
