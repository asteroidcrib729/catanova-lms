import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { AccessPortal } from "./access-portal";

const login = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/components/session-provider", () => ({ useSession }));

beforeEach(() => {
  login.mockReset().mockResolvedValue(undefined);
  replace.mockReset();
  useSession.mockReset().mockReturnValue({
    phase: "signed-out",
    login,
    refresh: vi.fn(),
  });
});

test("completes the labeled sign-in journey and enters the dashboard", async () => {
  render(<AccessPortal />);

  expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByLabelText("Username")).toHaveClass("border-muted");
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "mina.member" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct horse" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enter dashboard" }));

  await waitFor(() =>
    expect(login).toHaveBeenCalledWith("mina.member", "correct horse"),
  );
  expect(replace).toHaveBeenCalledWith("/dashboard");
});

test("exposes registration and bootstrap as keyboard-operable tabs", () => {
  render(<AccessPortal />);

  fireEvent.click(screen.getByRole("tab", { name: "Join" }));
  expect(
    screen.getByRole("heading", { name: "Create your membership" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Display name")).toHaveAttribute(
    "autocomplete",
    "name",
  );

  fireEvent.click(screen.getByRole("tab", { name: "First setup" }));
  expect(
    screen.getByRole("heading", { name: "Create the first administrator" }),
  ).toBeInTheDocument();
});

test("uses arrow, Home and End keys with roving tab focus and a labeled panel", () => {
  render(<AccessPortal />);
  const signIn = screen.getByRole("tab", { name: "Sign in" });
  signIn.focus();
  fireEvent.keyDown(signIn, { key: "ArrowRight" });
  const join = screen.getByRole("tab", { name: "Join" });
  expect(join).toHaveFocus();
  expect(join).toHaveAttribute("tabindex", "0");
  expect(signIn).toHaveAttribute("tabindex", "-1");
  expect(screen.getByRole("tabpanel", { name: "Join" })).toHaveAttribute(
    "id",
    "access-panel",
  );
  fireEvent.keyDown(join, { key: "End" });
  const setup = screen.getByRole("tab", { name: "First setup" });
  expect(setup).toHaveFocus();
  fireEvent.keyDown(setup, { key: "ArrowRight" });
  expect(signIn).toHaveFocus();
  fireEvent.keyDown(signIn, { key: "ArrowLeft" });
  expect(setup).toHaveFocus();
  fireEvent.keyDown(setup, { key: "Home" });
  expect(signIn).toHaveFocus();
});

test("uses the same Tailwind card recipe while checking and signed out", () => {
  useSession.mockReturnValue({ phase: "checking" });
  const view = render(<AccessPortal />);
  expect(screen.getByRole("status")).toHaveClass(
    "grid",
    "rounded-3xl",
    "bg-surface",
    "content-center",
  );
  expect(view.container.querySelector('[aria-hidden="true"]')).toHaveClass(
    "motion-safe:animate-spin",
  );
  useSession.mockReturnValue({ phase: "signed-out", login, refresh: vi.fn() });
  view.rerender(<AccessPortal />);
  expect(screen.getByRole("region", { name: "Welcome back" })).toHaveClass(
    "grid",
    "rounded-3xl",
    "bg-surface",
  );
});
