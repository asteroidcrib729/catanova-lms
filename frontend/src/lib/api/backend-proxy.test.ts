// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { forwardToBackend } from "./backend-proxy";

const ORIGIN = "https://catanova.example";
beforeEach(() => {
  vi.stubEnv("BACKEND_API_URL", "https://api.example");
  vi.stubEnv("APP_ORIGIN", ORIGIN);
});

test("canonical origin works behind TLS termination without trusting forwarded host", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  const request = new Request("http://internal.invalid/api/v1/auth/login", {
    method: "POST",
    body: "{}",
    headers: { Origin: ORIGIN, "X-Forwarded-Host": "attacker.example" },
  });
  expect((await forwardToBackend(request, ["auth", "login"])).status).toBe(200);
});

test("production refuses missing canonical dashboard origin", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_ORIGIN", "");
  expect((await forwardToBackend(write(), ["auth", "login"])).status).toBe(503);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function write(headers: Record<string, string> = {}, body = "{}") {
  return new Request(`${ORIGIN}/api/v1/catalog/books?limit=5`, {
    method: "POST",
    body,
    headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
  });
}

test("relays only library credentials and preserves separate host-only secure cookies", async () => {
  const reply = new Headers({
    "Content-Type": "application/json",
    "X-Request-ID": "audit",
  });
  reply.append(
    "Set-Cookie",
    "lms_session=opaque; Path=/; Secure; HttpOnly; SameSite=Lax",
  );
  reply.append("Set-Cookie", "lms_csrf=token; Path=/; Secure; SameSite=Lax");
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response('{"id":1}', { status: 201, headers: reply }),
    );
  const response = await forwardToBackend(
    write({
      Cookie:
        "analytics=private; lms_session=opaque; lms_csrf=token; _vercel_jwt=private",
      "X-CSRF-Token": "token",
      "Idempotency-Key": "stable-key",
      "X-Forwarded-Host": "attacker.example",
      Authorization: "Bearer unrelated",
    }),
    ["catalog", "books"],
  );
  const [url, options] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://api.example/api/v1/catalog/books?limit=5");
  const sent = new Headers(options?.headers);
  expect(sent.get("Origin")).toBe(ORIGIN);
  expect(sent.get("Cookie")).toBe("lms_session=opaque; lms_csrf=token");
  expect(sent.get("X-CSRF-Token")).toBe("token");
  expect(sent.get("Idempotency-Key")).toBe("stable-key");
  expect(sent.has("Authorization")).toBe(false);
  expect(sent.has("X-Forwarded-Host")).toBe(false);
  expect(options?.cache).toBe("no-store");
  expect(options?.redirect).toBe("manual");
  expect(response.status).toBe(201);
  expect(response.headers.getSetCookie()).toEqual(reply.getSetCookie());
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("X-Request-ID")).toBe("audit");
});

test.each(["https://attacker.example", "null", ""])(
  "rejects write origin %s",
  async (origin) => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await forwardToBackend(write({ Origin: origin }), [
      "auth",
      "login",
    ]);
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

test.each([
  "http://remote.example",
  "https://user:password@api.example",
  "https://api.example/base",
])("rejects unsafe backend setting %s", async (setting) => {
  vi.stubEnv("BACKEND_API_URL", setting);
  const fetchMock = vi.spyOn(globalThis, "fetch");
  expect((await forwardToBackend(write(), ["auth", "login"])).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("rejects missing backend, escaped paths, and oversized bodies without forwarding", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  expect((await forwardToBackend(write(), ["..", "health"])).status).toBe(400);
  expect((await forwardToBackend(write(), ["auth/login"])).status).toBe(400);
  expect(
    (await forwardToBackend(write({}, "x".repeat(65_537)), ["auth", "login"]))
      .status,
  ).toBe(413);
  vi.stubEnv("BACKEND_API_URL", "");
  expect((await forwardToBackend(write(), ["auth", "login"])).status).toBe(503);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("never replays a write or exposes internal network errors", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("private network detail"));
  const response = await forwardToBackend(write(), ["catalog", "books"]);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private network detail");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("does not follow redirects or rewrite upstream domain-scoped cookies", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockResolvedValueOnce(
    new Response(null, {
      status: 307,
      headers: { Location: "https://elsewhere.example" },
    }),
  );
  expect((await forwardToBackend(write(), ["auth", "login"])).status).toBe(502);
  fetchMock.mockResolvedValueOnce(
    new Response(null, {
      headers: { "Set-Cookie": "lms_session=x; Domain=api.example; Path=/" },
    }),
  );
  expect((await forwardToBackend(write(), ["auth", "login"])).status).toBe(502);
});

test("only proxies the two read-only health checks", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response('{"status":"ready"}'));
  expect(
    (
      await forwardToBackend(
        new Request(`${ORIGIN}/health/ready`),
        ["ready"],
        "health",
      )
    ).status,
  ).toBe(200);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    "https://api.example/health/ready",
  );
  expect((await forwardToBackend(write(), ["ready"], "health")).status).toBe(
    405,
  );
  expect(
    (
      await forwardToBackend(
        new Request(`${ORIGIN}/health/other`),
        ["other"],
        "health",
      )
    ).status,
  ).toBe(404);
});
