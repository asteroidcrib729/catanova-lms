import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { DashboardShell } from "./dashboard-shell";

const replace = vi.hoisted(() => vi.fn());
const logout = vi.hoisted(() => vi.fn());
const useSession = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/dynamic", () => ({
  default: () => () => <div>Capability panel</div>,
}));
vi.mock("@/components/session-provider", () => ({ useSession }));

beforeEach(() => {
  replace.mockReset();
  logout.mockReset();
  useSession.mockReset();
});

test("shows administrator navigation and signs out from a named control", () => {
  useSession.mockReturnValue({
    phase: "signed-in",
    principal: {
      user_id: 1,
      display_name: "Ada Admin",
      username: "ada.admin",
      role: "administrator",
    },
    logout,
  });
  render(<DashboardShell />);
  expect(screen.getAllByRole("link", { name: /CataNova.*home/ })).toHaveLength(
    2,
  );
  expect(screen.getByText("CataNova workspace")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Accounts" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(logout).toHaveBeenCalledOnce();
});

test("hides the closed mobile menu and restores toggle focus on Escape", () => {
  useSession.mockReturnValue({
    phase: "signed-in",
    principal: {
      user_id: 2,
      display_name: "QA",
      username: "qa.member",
      role: "member",
    },
    logout,
  });
  render(<DashboardShell />);
  const menu = screen.getByRole("button", { name: "Menu" });
  const panel = document.getElementById("dashboard-navigation")!;
  expect(panel).toHaveClass("max-[760px]:invisible");
  fireEvent.click(menu);
  expect(panel).toHaveClass("max-[760px]:visible");
  fireEvent.keyDown(panel, { key: "Escape" });
  expect(panel).toHaveClass("max-[760px]:invisible");
  expect(menu).toHaveFocus();
  expect(
    screen.getByRole("heading", { level: 1, name: "Library dashboard" }),
  ).toBeInTheDocument();
});

test("does not present administrator account controls to a member", () => {
  useSession.mockReturnValue({
    phase: "signed-in",
    principal: {
      user_id: 2,
      display_name: "Mina Member",
      username: "mina.member",
      role: "member",
    },
    logout,
  });
  render(<DashboardShell />);
  expect(
    screen.queryByRole("button", { name: "Accounts" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "Dashboard sections" }),
  ).toBeInTheDocument();
});
