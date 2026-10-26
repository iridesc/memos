import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PagedMemoList from "@/components/PagedMemoList";
import { MemoMoveContext } from "@/components/PagedMemoList/MemoMoveContext";
import { State } from "@/types/proto/api/v1/common_pb";
import { type Memo, MemoSchema } from "@/types/proto/api/v1/memo_service_pb";

const mocks = vi.hoisted(() => ({
  data: { pages: [] as { memos: Memo[] }[] },
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/useMemoQueries", () => ({ useInfiniteMemos: () => ({ ...mocks, isLoading: false, isFetchingNextPage: false }) }));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.error } }));
vi.mock("@/contexts/MemoFilterContext", () => ({ useMemoFilterContext: () => ({ filters: [] }) }));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));
vi.mock("@/components/MemoContent/MentionResolutionContext", () => ({
  MentionResolutionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/MemoFilters", () => ({ default: () => null }));
vi.mock("@/components/MemoEditor", () => ({ default: () => null }));

function Card({ memo }: { memo: Memo }) {
  const move = useContext(MemoMoveContext);
  return (
    <div data-testid="card">
      {memo.name}
      {move && (
        <>
          <button disabled={move.moving || !move.canMoveUp} onClick={() => move.move(-1)}>
            {memo.name}-up
          </button>
          <button disabled={move.moving || !move.canMoveDown} onClick={() => move.move(1)}>
            {memo.name}-down
          </button>
        </>
      )}
    </div>
  );
}
const memo = (name: string) => create(MemoSchema, { name, state: State.NORMAL });
type Reorder = (from: number, to: number, memo: Memo, reordered: Memo[]) => Promise<void>;
function mount(onReorder = vi.fn<Reorder>(async () => {})) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PagedMemoList renderer={(memo) => <Card memo={memo} />} onReorder={onReorder} />
    </QueryClientProvider>,
  );
  return onReorder;
}
beforeEach(() => {
  mocks.data = { pages: [{ memos: [memo("a"), memo("b"), memo("c")] }] };
  mocks.hasNextPage = false;
});

describe("Today movement list", () => {
  it("disables unavailable directions and locks other actions until persistence finishes", async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    mount(save);
    expect(screen.getByText("a-up")).toBeDisabled();
    expect(screen.getByText("c-down")).toBeDisabled();
    fireEvent.click(screen.getByText("b-up"));
    expect(screen.getAllByTestId("card").map((node) => node.textContent?.[0])).toEqual(["b", "a", "c"]);
    expect(screen.getByText("a-down")).toBeDisabled();
    expect(save).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(screen.getByText("b-up")).not.toBeDisabled());
  });
  it("loads the next page before moving across the page boundary", async () => {
    mocks.hasNextPage = true;
    mocks.fetchNextPage.mockResolvedValue({ data: { pages: [...mocks.data.pages, { memos: [memo("d")] }] }, hasNextPage: false });
    const save = mount();
    fireEvent.click(screen.getByText("c-down"));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][3].map((item: Memo) => item.name)).toEqual(["a", "b", "d", "c"]);
  });
  it("restores list order and displays a failed save", async () => {
    mount(
      vi.fn(async () => {
        throw new Error("Save failed");
      }),
    );
    fireEvent.click(screen.getByText("b-up"));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Save failed"));
    await waitFor(() => expect(screen.getAllByTestId("card").map((node) => node.textContent?.[0])).toEqual(["a", "b", "c"]));
  });
});
