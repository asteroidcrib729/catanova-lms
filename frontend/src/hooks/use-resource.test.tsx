import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { apiRequest } from "@/lib/api/request";

import { useResource } from "./use-resource";

vi.mock("@/lib/api/request", () => ({ apiRequest: vi.fn() }));
const requestMock = vi.mocked(apiRequest);

beforeEach(() => {
  requestMock.mockReset();
});

test("a cancelled resource response cannot overwrite the replacement", async () => {
  let resolveOld!: (data: string) => void;
  requestMock.mockImplementationOnce(
    () => new Promise<string>((resolve) => (resolveOld = resolve)),
  );
  requestMock.mockResolvedValueOnce("current");
  const { result, rerender } = renderHook(
    ({ path }) => useResource<string>(path),
    { initialProps: { path: "/api/v1/old" } },
  );
  rerender({ path: "/api/v1/current" });
  await waitFor(() =>
    expect(result.current).toMatchObject({ data: "current" }),
  );
  await act(async () => resolveOld("stale"));
  expect(result.current).toMatchObject({ phase: "ready", data: "current" });
});

test("an unexpected abort reports an error instead of staying loading", async () => {
  requestMock.mockRejectedValue(
    new DOMException("Unexpected abort", "AbortError"),
  );
  const { result } = renderHook(() => useResource("/api/v1/resource"));
  await waitFor(() => expect(result.current).toMatchObject({ phase: "error" }));
});
