import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { SessionProvider, useSession } from "./session-provider";

function Probe() {
  const session = useSession();
  return <span>{session.phase}</span>;
}

afterEach(() => vi.restoreAllMocks());

test.each([
  [401, { code: "authentication_required", message: "Sign in." }, "signed-out"],
  [
    200,
    {
      principal: {
        user_id: 8,
        display_name: "Mina Reader",
        username: "mina.reader",
        role: "member",
      },
      csrf_token: "csrf",
      expires_at: "2030-01-01",
    },
    "signed-in",
  ],
] as const)(
  "Strict Mode resolves session status %s through the real request client",
  async (status, body, phase) => {
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
      new Response(JSON.stringify(body), { status }),
    );

    render(
      <StrictMode>
        <SessionProvider>
          <Probe />
        </SessionProvider>
      </StrictMode>,
    );

    expect(await screen.findByText(phase)).toBeInTheDocument();
    expect(screen.queryByText("checking")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  },
);
