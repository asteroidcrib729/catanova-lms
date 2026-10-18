import { afterEach, expect, test, vi } from "vitest";

import { getPublicApiBaseUrl } from "./config";

afterEach(() => vi.unstubAllEnvs());

test("empty public API setting uses the same-origin relay", () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
  expect(getPublicApiBaseUrl()).toBe("");
});

test("retains explicit loopback-only direct development", () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
  expect(getPublicApiBaseUrl()).toBe("http://127.0.0.1:8000");
});

test.each([
  "https://api.onrender.com",
  "https://db.prisma.io",
  "http://user:secret@localhost:8000",
])(
  "does not allow hosted or credential-bearing browser configuration %s",
  (value) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", value);
    expect(getPublicApiBaseUrl).toThrow();
  },
);
