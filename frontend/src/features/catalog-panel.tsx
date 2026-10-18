"use client";

import { useState, type FormEvent } from "react";

import {
  CommandNotice,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/async-state";
import { useCommand } from "@/hooks/use-command";
import { useResource } from "@/hooks/use-resource";
import type { CatalogEntry, Principal, ReservationView } from "@/lib/api/types";

import { ui } from "@/lib/ui";

export function CatalogPanel({ principal }: { principal: Principal }) {
  const [query, setQuery] = useState("");
  const path = `/api/v1/catalog/books?limit=100${query ? `&query=${encodeURIComponent(query)}` : ""}`;
  const catalog = useResource<CatalogEntry[]>(path);
  const command = useCommand<ReservationView>();
  const addBook = useCommand();
  const inventory = useCommand();
  const isStaff = principal.role !== "member";

  async function createBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await addBook.execute({
      method: "POST",
      path: "/api/v1/catalog/books",
      body: {
        title: String(data.get("title")),
        author: String(data.get("author")),
        publication_year: Number(data.get("year")),
        category: String(data.get("category")) || null,
      },
      successMessage: "Book added to the catalog.",
      onSuccess: () => {
        form.reset();
        catalog.retry();
      },
    });
  }

  async function updateInventory(
    event: FormEvent<HTMLFormElement>,
    action: "add-copy" | "update-status",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const barcode = String(data.get("barcode"));
    await inventory.execute({
      method: action === "add-copy" ? "POST" : "PATCH",
      path:
        action === "add-copy"
          ? `/api/v1/catalog/books/${Number(data.get("bookId"))}/copies`
          : `/api/v1/catalog/copies/${encodeURIComponent(barcode)}`,
      body:
        action === "add-copy"
          ? { barcode }
          : { status: String(data.get("status")) },
      successMessage:
        action === "add-copy" ? "Physical copy added." : "Copy status updated.",
      onSuccess: () => {
        form.reset();
        catalog.retry();
      },
    });
  }

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Catalog</p>
          <h2 className={ui.panelTitle}>Find your next book</h2>
          <p className={ui.panelDescription}>
            Search titles and authors, then reserve an available physical
            collection.
          </p>
        </div>
        <label className={`${ui.label} w-full min-[761px]:w-[min(100%,320px)]`}>
          <span>Search catalog</span>
          <input
            className={ui.input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title or author"
          />
        </label>
      </header>

      <CommandNotice state={command.state} retry={command.retry} />
      {catalog.phase === "loading" || catalog.phase === "waking" ? (
        <LoadingState waking={catalog.phase === "waking"} />
      ) : catalog.phase === "error" ? (
        <ErrorState error={catalog.error} retry={catalog.retry} />
      ) : catalog.data.length === 0 ? (
        <EmptyState>No books match this search yet.</EmptyState>
      ) : (
        <div className={ui.grid}>
          {catalog.data.map((entry) => (
            <article
              className="flex min-w-0 overflow-hidden rounded-[18px] border border-border bg-surface"
              key={entry.book.id}
            >
              <div
                className="grid w-[72px] shrink-0 place-items-center bg-[color-mix(in_srgb,var(--accent)_15%,var(--surface))] font-mono text-[1.6rem] text-accent-strong"
                aria-hidden="true"
              >
                {entry.book.title.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-start p-5">
                <p className={ui.meta}>
                  {entry.book.category ?? "Uncategorized"}
                </p>
                <h3 className={ui.cardTitle}>{entry.book.title}</h3>
                <p className="text-muted">by {entry.book.author}</p>
                <div className="mt-2.5 mb-[18px] flex items-center gap-[7px] text-[0.78rem] text-muted">
                  <span
                    className={`size-2 rounded-full ${entry.available_copies ? "bg-accent" : "bg-danger"}`}
                  />
                  {entry.available_copies} of {entry.total_copies} available
                </div>
                <button
                  className={`${ui.button} ${ui.secondary} mt-auto`}
                  type="button"
                  disabled={
                    entry.total_copies === 0 ||
                    command.state.phase === "pending"
                  }
                  onClick={() =>
                    void command.execute({
                      method: "POST",
                      path: `/api/v1/circulation/reservations/books/${entry.book.id}`,
                      successMessage: `Reserved “${entry.book.title}”.`,
                    })
                  }
                >
                  Reserve
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isStaff ? (
        <section className={ui.panelStack} aria-labelledby="inventory-heading">
          <div>
            <p className={ui.eyebrow}>Staff workspace</p>
            <h3 className={ui.cardTitle} id="inventory-heading">
              Catalog inventory
            </h3>
          </div>
          <div className={ui.formGrid}>
            <details className={ui.workForm}>
              <summary className="cursor-pointer font-bold in-open:mb-5">
                Add a catalog title
              </summary>
              <form className={ui.form} onSubmit={createBook}>
                <div className={ui.formGrid}>
                  <label className={ui.label}>
                    Title
                    <input
                      className={ui.input}
                      name="title"
                      required
                      maxLength={300}
                    />
                  </label>
                  <label className={ui.label}>
                    Author
                    <input
                      className={ui.input}
                      name="author"
                      required
                      maxLength={200}
                    />
                  </label>
                  <label className={ui.label}>
                    Publication year
                    <input
                      className={ui.input}
                      name="year"
                      type="number"
                      min={1}
                      max={9999}
                      required
                    />
                  </label>
                  <label className={ui.label}>
                    Category
                    <input
                      className={ui.input}
                      name="category"
                      maxLength={100}
                    />
                  </label>
                </div>
                <button
                  className={`${ui.button} ${ui.primary}`}
                  disabled={addBook.state.phase === "pending"}
                >
                  Add title
                </button>
                <CommandNotice state={addBook.state} retry={addBook.retry} />
              </form>
            </details>
            <details className={ui.workForm}>
              <summary className="cursor-pointer font-bold in-open:mb-5">
                Add a physical copy
              </summary>
              <form
                className={ui.form}
                onSubmit={(event) => void updateInventory(event, "add-copy")}
              >
                <label className={ui.label}>
                  Catalog book ID
                  <input
                    className={ui.input}
                    name="bookId"
                    type="number"
                    min={1}
                    required
                  />
                </label>
                <label className={ui.label}>
                  Barcode
                  <input
                    className={ui.input}
                    name="barcode"
                    required
                    maxLength={100}
                  />
                </label>
                <button
                  className={`${ui.button} ${ui.primary}`}
                  disabled={inventory.state.phase === "pending"}
                >
                  Add copy
                </button>
              </form>
            </details>
            <details className={ui.workForm}>
              <summary className="cursor-pointer font-bold in-open:mb-5">
                Update copy status
              </summary>
              <form
                className={ui.form}
                onSubmit={(event) =>
                  void updateInventory(event, "update-status")
                }
              >
                <label className={ui.label}>
                  Barcode
                  <input
                    className={ui.input}
                    name="barcode"
                    required
                    maxLength={100}
                  />
                </label>
                <label className={ui.label}>
                  New status
                  <select
                    className={ui.input}
                    name="status"
                    defaultValue="available"
                  >
                    <option value="available">Available</option>
                    <option value="lost">Lost</option>
                    <option value="damaged">Damaged</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </label>
                <button
                  className={`${ui.button} ${ui.secondary}`}
                  disabled={inventory.state.phase === "pending"}
                >
                  Update status
                </button>
              </form>
            </details>
          </div>
          <CommandNotice state={inventory.state} retry={inventory.retry} />
        </section>
      ) : null}
    </div>
  );
}
