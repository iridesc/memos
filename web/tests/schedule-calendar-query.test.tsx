import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { useScheduleCalendar } from "@/hooks/useScheduleCalendar";

const mocks = vi.hoisted(() => ({ listMemos: vi.fn() }));
vi.mock("@/connect", () => ({ memoServiceClient: mocks }));
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

describe("calendar query", () => {
  it("loads all pages and scopes counts to the owner and planned date range", async () => {
    mocks.listMemos
      .mockResolvedValueOnce({ memos: [{ name: "memos/a" }], nextPageToken: "page2" })
      .mockResolvedValueOnce({ memos: [{ name: "memos/b" }], nextPageToken: "" });
    const start = new Date(2026, 9, 1);
    const end = new Date(2026, 10, 1);
    const { result } = renderHook(() => useScheduleCalendar("users/alice", start, end), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.memos.map((memo) => memo.name)).toEqual(["memos/a", "memos/b"]);
    expect(mocks.listMemos.mock.calls[1][0].pageToken).toBe("page2");
    expect(mocks.listMemos.mock.calls[0][0].filter).toContain('creator == "users/alice"');
    expect(mocks.listMemos.mock.calls[0][0].filter).toContain(`plan_start_ts < ${end.getTime() / 1000}`);
    expect(mocks.listMemos.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("does not expose partial counts if a later page fails", async () => {
    mocks.listMemos
      .mockResolvedValueOnce({ memos: [{ name: "memos/a" }], nextPageToken: "page2" })
      .mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useScheduleCalendar("users/alice", new Date(2026, 9, 1), new Date(2026, 10, 1)), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
  it("does not query without an authenticated user", () => {
    renderHook(() => useScheduleCalendar(undefined, new Date(2026, 9, 1), new Date(2026, 10, 1)), { wrapper });
    expect(mocks.listMemos).not.toHaveBeenCalled();
  });
});
