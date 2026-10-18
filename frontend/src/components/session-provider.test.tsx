import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { apiRequest } from "@/lib/api/request";
import type { Session } from "@/lib/api/types";

import { SessionProvider, useSession } from "./session-provider";

vi.mock("@/lib/api/request", () => ({ apiRequest: vi.fn() }));

const requestMock = vi.mocked(apiRequest);
const principal = {
  user_id: 8,
  display_name: "Mina Reader",
  username: "mina.reader",
  role: "member" as const,
};

function Probe() {
  const session = useSession();
  return (
    <div>
      <span>{session.phase}</span>
      <span>{session.principal?.display_name}</span>
      <button
        type="button"
        onClick={() => void session.login("mina.reader", "password")}
      >
        Login
      </button>
      <button type="button" onClick={() => void session.logout()}>
        Logout
      </button>
      <button type="button" onClick={session.refresh}>
        Refresh
      </button>
    </div>
  );
}

beforeEach(() => {
  requestMock.mockReset();
});

test("recovers an existing browser session", async () => {
  requestMock.mockResolvedValue({
    principal,
    csrf_token: "csrf",
    expires_at: "2030-01-01",
  });
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText("Mina Reader")).toBeInTheDocument();
  expect(screen.getByText("signed-in")).toBeInTheDocument();
});

test("clears local principal state when another request reports unauthorized", async () => {
  requestMock.mockResolvedValue({
    principal,
    csrf_token: "csrf",
    expires_at: "2030-01-01",
  });
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText("Mina Reader")).toBeInTheDocument();
  act(() => window.dispatchEvent(new Event("lms:unauthorized")));
  expect(screen.getByText("signed-out")).toBeInTheDocument();
});

test("a superseded session response cannot replace the current principal", async () => {
  let resolveOld!: (session: Session) => void;
  requestMock.mockImplementationOnce(
    () => new Promise<Session>((resolve) => (resolveOld = resolve)),
  );
  requestMock.mockResolvedValueOnce({
    principal,
    csrf_token: "csrf",
    expires_at: "2030-01-01",
  });
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  expect(await screen.findByText("Mina Reader")).toBeInTheDocument();

  await act(async () => {
    resolveOld({
      principal: { ...principal, display_name: "Stale Reader" },
      csrf_token: "old-csrf",
      expires_at: "2030-01-01",
    });
  });
  expect(screen.getByText("Mina Reader")).toBeInTheDocument();
  expect(screen.queryByText("Stale Reader")).not.toBeInTheDocument();
});

test("an unexpected abort does not leave an active session check stuck", async () => {
  requestMock.mockRejectedValue(
    new DOMException("Unexpected abort", "AbortError"),
  );
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  expect(await screen.findByText("unavailable")).toBeInTheDocument();
});
