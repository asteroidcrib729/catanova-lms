import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { CirculationPanel } from "./circulation-panel";

vi.mock("@/hooks/use-command", () => ({
  useCommand: () => ({ state: { phase: "idle" }, retry: vi.fn() }),
}));
vi.mock("@/hooks/use-resource", () => ({
  useResource: (path: string) => ({
    phase: "ready",
    retry: vi.fn(),
    data: path.includes("/loans")
      ? [
          {
            book: { title: "A World of Ideas" },
            copy: { barcode: "CAT-001" },
            loan: { id: 1, due_at: "2026-09-01", returned_at: null },
            borrower_username: "mina.member",
            is_overdue: true,
          },
        ]
      : [],
  }),
}));

test("keeps populated loan tables in their own scroll container", () => {
  const { container } = render(
    <CirculationPanel
      principal={{
        user_id: 2,
        username: "mina.member",
        display_name: "Mina Member",
        role: "member",
      }}
    />,
  );
  expect(container.firstElementChild).toHaveClass("min-w-0", "*:min-w-0");
  const table = screen.getByRole("table");
  expect(table.parentElement).toHaveClass(
    "relative",
    "min-w-0",
    "overflow-x-auto",
  );
  for (const cell of table.querySelectorAll("th, td")) {
    expect(cell).toHaveClass("border-b", "border-border", "px-4", "py-3.5");
  }
  expect(screen.getByText("Overdue", { exact: true })).toHaveClass(
    "bg-danger/13",
    "text-danger",
  );
  expect(
    screen.getByRole("columnheader", { name: "Actions" }),
  ).toBeInTheDocument();
});
