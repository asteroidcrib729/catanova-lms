import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { BRAND_TITLE } from "@/lib/brand";

import { BrandLogo } from "./brand-logo";

test("uses the exact requested browser title", () => {
  expect(BRAND_TITLE).toBe("CataNova - Catalog. Manage. Discover.");
});

test("links the accessible CataNova wordmark home with its SVG and tagline", () => {
  render(<BrandLogo />);
  const link = screen.getByRole("link", { name: "CataNova home" });
  expect(link).toHaveAttribute("href", "/");
  expect(link.querySelector("img")).toHaveAttribute(
    "src",
    "/brand/catanova-mark.svg",
  );
  expect(link.querySelector("img")).toHaveAttribute("alt", "");
  expect(screen.getByText("Catalog. Manage. Discover.")).toBeInTheDocument();
});

test("the compact logo retains the wordmark without a repeated tagline", () => {
  render(<BrandLogo compact />);
  expect(screen.getByRole("link", { name: "CataNova home" })).toHaveTextContent(
    "CataNova",
  );
  expect(
    screen.queryByText("Catalog. Manage. Discover."),
  ).not.toBeInTheDocument();
});

test("supports responsive sizing and caller-supplied Tailwind utilities", () => {
  render(<BrandLogo responsive className="max-[760px]:hidden" />);
  const link = screen.getByRole("link", { name: "CataNova home" });
  expect(link).toHaveClass("max-[760px]:hidden", "max-[760px]:text-[1.2rem]");
  expect(link.querySelector("img")).toHaveClass("max-[760px]:size-9");
  expect(screen.getByText("Catalog. Manage. Discover.")).toHaveClass(
    "max-[760px]:hidden",
  );
});
