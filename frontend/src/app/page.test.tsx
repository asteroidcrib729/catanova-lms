import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import Home from "./page";

vi.mock("@/components/access-portal", () => ({
  AccessPortal: () => (
    <section aria-label="CataNova sign-in">Access portal</section>
  ),
}));

test("introduces CataNova through its three real library capabilities", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Your next chapter,",
  );
  for (const name of ["Catalog.", "Manage.", "Discover."]) {
    expect(screen.getByRole("heading", { name, level: 3 })).toBeInTheDocument();
  }
  expect(
    screen.getByRole("region", { name: "CataNova sign-in" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Your workspace" })).toHaveAttribute(
    "href",
    "#access",
  );
  expect(document.getElementById("access")).toBeInTheDocument();
  expect(document.getElementById("possibilities")).toBeInTheDocument();
});
