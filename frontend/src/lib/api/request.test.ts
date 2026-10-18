import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { apiRequest, createIdempotencyKey } from "./request";
import { ApiError } from "./types";

beforeEach(() => {
  document.cookie = "lms_csrf=csrf-value; path=/";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("adds credentials, CSRF, and the retained idempotency key to commands", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  await apiRequest("/api/v1/example", {
    method: "POST",
    body: { title: "Example" },
    idempotencyKey: "stable-command-key",
  });

  const [, init] = fetchMock.mock.calls[0];
  const headers = new Headers(init?.headers);
  expect(init?.credentials).toBe("include");
  expect(headers.get("X-CSRF-Token")).toBe("csrf-value");
  expect(headers.get("Idempotency-Key")).toBe("stable-command-key");
});

test("shares simultaneous safe reads", async () => {
  let resolveFetch!: (response: Response) => void;
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );

  const first = apiRequest<{ value: number }>("/api/v1/shared");
  const second = apiRequest<{ value: number }>("/api/v1/shared");
  resolveFetch(new Response(JSON.stringify({ value: 4 }), { status: 200 }));

  await expect(Promise.all([first, second])).resolves.toEqual([
    { value: 4 },
    { value: 4 },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("classifies a paused database separately from a waking gateway", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        code: "database_unavailable",
        message: "The database is temporarily unavailable.",
        request_id: "request-7",
      }),
      { status: 503 },
    ),
  );

  const request = apiRequest("/api/v1/finance/fines", { method: "POST" });

  await expect(request).rejects.toMatchObject({
    kind: "database_unavailable",
    requestId: "request-7",
  } satisfies Partial<ApiError>);
});

test("announces an unauthorized response so session state can be cleared", async () => {
  const unauthorized = vi.fn();
  window.addEventListener("lms:unauthorized", unauthorized, { once: true });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({ code: "authentication_required", message: "Sign in." }),
      {
        status: 401,
      },
    ),
  );

  await expect(
    apiRequest("/api/v1/private", { method: "POST" }),
  ).rejects.toMatchObject({
    kind: "authentication",
  });
  expect(unauthorized).toHaveBeenCalledOnce();
});

test("bounds automatic retries while a safe read is waking", async () => {
  vi.useFakeTimers();
  const onWarming = vi.fn();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response("<h1>Starting</h1>", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      }),
  );

  const request = apiRequest("/api/v1/waking", { onWarming });
  const result = expect(request).rejects.toMatchObject({
    kind: "service_warming",
  });
  await vi.runAllTimersAsync();
  await result;

  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(onWarming).toHaveBeenCalledTimes(3);
});

test("cancels an in-flight read without converting it into a network error", async () => {
  const controller = new AbortController();
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Fetch cancelled", "AbortError"));
        });
      }),
  );

  const request = apiRequest("/api/v1/cancelled", {
    signal: controller.signal,
  });
  controller.abort();

  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});

test("a replacement read does not inherit the cancelled request", async () => {
  const controller = new AbortController();
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockImplementationOnce(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Fetch cancelled", "AbortError"));
        });
      }),
  );
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ value: 9 }), { status: 200 }),
  );

  const cancelled = apiRequest("/api/v1/replacement", {
    signal: controller.signal,
  });
  const cancelledResult = expect(cancelled).rejects.toMatchObject({
    name: "AbortError",
  });
  controller.abort();
  const replacement = apiRequest("/api/v1/replacement", {
    signal: new AbortController().signal,
  });

  await cancelledResult;
  await expect(replacement).resolves.toEqual({ value: 9 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("cancelling one caller does not cancel another caller's read", async () => {
  const controller = new AbortController();
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockImplementationOnce(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Fetch cancelled", "AbortError"));
        });
      }),
  );
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ value: 5 }), { status: 200 }),
  );

  const first = apiRequest("/api/v1/independent", {
    signal: controller.signal,
  });
  const firstResult = expect(first).rejects.toMatchObject({
    name: "AbortError",
  });
  const second = apiRequest("/api/v1/independent", {
    signal: new AbortController().signal,
  });
  controller.abort();

  await firstResult;
  await expect(second).resolves.toEqual({ value: 5 });
});

test.each(["GET", "POST"] as const)(
  "an already-cancelled %s request never reaches fetch",
  async (method) => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    await expect(
      apiRequest("/api/v1/already-cancelled", {
        method,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

test("cancellation at the start of backoff stops retries immediately", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("Starting", { status: 503 }));
  const request = apiRequest("/api/v1/cancel-backoff", {
    signal: controller.signal,
    onWarming: () => controller.abort(),
  });
  const result = expect(request).rejects.toMatchObject({ name: "AbortError" });
  await vi.runAllTimersAsync();
  await result;
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("bounds retries when fetch keeps timing out", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Fetch timed out", "AbortError"));
        });
      }),
  );
  const request = apiRequest("/api/v1/timeouts");
  const result = expect(request).rejects.toMatchObject({ kind: "network" });
  await vi.runAllTimersAsync();
  await result;
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test("a cancelled error response cannot clear a newer session", async () => {
  const controller = new AbortController();
  let resolveBody!: (body: object) => void;
  let startBody!: () => void;
  const bodyStarted = new Promise<void>((resolve) => (startBody = resolve));
  const body = new Promise<object>((resolve) => (resolveBody = resolve));
  const response = new Response(null, { status: 401 });
  vi.spyOn(response, "json").mockImplementation(() => {
    startBody();
    return body;
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
  const unauthorized = vi.fn();
  window.addEventListener("lms:unauthorized", unauthorized);
  try {
    const request = apiRequest("/api/v1/stale-unauthorized", {
      signal: controller.signal,
    });
    const result = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    await bodyStarted;
    controller.abort();
    resolveBody({ code: "authentication_required", message: "Sign in." });
    await result;
    expect(unauthorized).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener("lms:unauthorized", unauthorized);
  }
});

describe("command keys", () => {
  test("creates a distinct key for each user action", () => {
    expect(createIdempotencyKey()).not.toBe(createIdempotencyKey());
  });
});
