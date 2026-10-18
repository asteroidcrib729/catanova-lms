"use client";

import { type FormEvent } from "react";

import {
  CommandNotice,
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/async-state";
import { useCommand } from "@/hooks/use-command";
import { useResource } from "@/hooks/use-resource";
import type { LoanView, Principal, ReservationView } from "@/lib/api/types";

import { ui } from "@/lib/ui";

export function CirculationPanel({ principal }: { principal: Principal }) {
  const loans = useResource<LoanView[]>("/api/v1/circulation/loans?limit=100");
  const reservations = useResource<ReservationView[]>(
    "/api/v1/circulation/reservations?limit=100",
  );
  const command = useCommand();
  const isStaff = principal.role !== "member";
  const refresh = () => {
    loans.retry();
    reservations.retry();
  };

  async function staffAction(
    event: FormEvent<HTMLFormElement>,
    action: "checkout" | "return",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await command.execute({
      method: "POST",
      path:
        action === "checkout"
          ? "/api/v1/circulation/loans/checkout"
          : "/api/v1/circulation/loans/return",
      body:
        action === "checkout"
          ? {
              borrower_username: String(data.get("username")),
              barcode: String(data.get("barcode")),
            }
          : { barcode: String(data.get("barcode")) },
      successMessage:
        action === "checkout" ? "Copy checked out." : "Copy returned.",
      onSuccess: () => {
        form.reset();
        refresh();
      },
    });
  }

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Circulation</p>
          <h2 className={ui.panelTitle}>Loans and reservations</h2>
          <p className={ui.panelDescription}>
            Keep due dates and reservation queues visible.
          </p>
        </div>
      </header>
      <CommandNotice state={command.state} retry={command.retry} />
      <section aria-labelledby="loans-title">
        <h3 className={ui.cardTitle} id="loans-title">
          Loans
        </h3>
        {loans.phase === "loading" || loans.phase === "waking" ? (
          <LoadingState waking={loans.phase === "waking"} />
        ) : loans.phase === "error" ? (
          <ErrorState error={loans.error} retry={loans.retry} />
        ) : loans.data.length === 0 ? (
          <EmptyState>No loans are recorded for this view.</EmptyState>
        ) : (
          <div className="relative min-w-0 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border px-4 py-3.5 text-left align-middle text-[0.72rem] text-muted uppercase">
                    Book
                  </th>
                  <th className="border-b border-border px-4 py-3.5 text-left align-middle text-[0.72rem] text-muted uppercase">
                    Copy
                  </th>
                  <th className="border-b border-border px-4 py-3.5 text-left align-middle text-[0.72rem] text-muted uppercase">
                    Due
                  </th>
                  <th className="border-b border-border px-4 py-3.5 text-left align-middle text-[0.72rem] text-muted uppercase">
                    Status
                  </th>
                  <th className="border-b border-border px-4 py-3.5 text-left align-middle text-[0.72rem] text-muted uppercase">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loans.data.map((item) => (
                  <tr key={item.loan.id}>
                    <td className="border-b border-border px-4 py-3.5 text-left align-middle">
                      <strong>{item.book.title}</strong>
                      <small className={ui.recordDetail}>
                        {item.borrower_username}
                      </small>
                    </td>
                    <td className="border-b border-border px-4 py-3.5 text-left align-middle">
                      <code className="font-mono text-[0.78rem]">
                        {item.copy.barcode}
                      </code>
                    </td>
                    <td className="border-b border-border px-4 py-3.5 text-left align-middle">
                      {formatDate(item.loan.due_at)}
                    </td>
                    <td className="border-b border-border px-4 py-3.5 text-left align-middle">
                      <span
                        className={item.is_overdue ? ui.badgeDanger : ui.badge}
                      >
                        {item.loan.returned_at
                          ? "Returned"
                          : item.is_overdue
                            ? "Overdue"
                            : "Active"}
                      </span>
                    </td>
                    <td className="border-b border-border px-4 py-3.5 text-left align-middle">
                      {!item.loan.returned_at ? (
                        <button
                          className={ui.textButton}
                          type="button"
                          onClick={() =>
                            void command.execute({
                              method: "POST",
                              path: `/api/v1/circulation/loans/${item.loan.id}/renew`,
                              successMessage: "Loan renewed.",
                              onSuccess: refresh,
                            })
                          }
                        >
                          Renew
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="reservations-title">
        <h3 className={ui.cardTitle} id="reservations-title">
          Reservations
        </h3>
        {reservations.phase === "loading" || reservations.phase === "waking" ? (
          <LoadingState waking={reservations.phase === "waking"} />
        ) : reservations.phase === "error" ? (
          <ErrorState error={reservations.error} retry={reservations.retry} />
        ) : reservations.data.length === 0 ? (
          <EmptyState>No reservations are waiting.</EmptyState>
        ) : (
          <ul className={ui.recordList}>
            {reservations.data.map((item) => (
              <li className={ui.record} key={item.reservation.id}>
                <div>
                  <strong>{item.book_title}</strong>
                  <span className={ui.recordDetail}>
                    {item.reservation.status}
                    {item.queue_position
                      ? ` · Queue ${item.queue_position}`
                      : ""}
                  </span>
                </div>
                {item.reservation.status === "active" ? (
                  <button
                    className={ui.textButton}
                    type="button"
                    onClick={() =>
                      void command.execute({
                        method: "POST",
                        path: `/api/v1/circulation/reservations/${item.reservation.id}/cancel`,
                        successMessage: "Reservation cancelled.",
                        onSuccess: refresh,
                      })
                    }
                  >
                    Cancel
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {isStaff ? (
        <div className={ui.formGrid}>
          <form
            className={ui.workForm}
            onSubmit={(event) => void staffAction(event, "checkout")}
          >
            <h3 className={ui.cardTitle}>Check out a copy</h3>
            <label className={ui.label}>
              Borrower username
              <input className={ui.input} name="username" required />
            </label>
            <label className={ui.label}>
              Barcode
              <input className={ui.input} name="barcode" required />
            </label>
            <button className={`${ui.button} ${ui.primary}`}>Check out</button>
          </form>
          <form
            className={ui.workForm}
            onSubmit={(event) => void staffAction(event, "return")}
          >
            <h3 className={ui.cardTitle}>Return a copy</h3>
            <label className={ui.label}>
              Barcode
              <input className={ui.input} name="barcode" required />
            </label>
            <button className={`${ui.button} ${ui.primary}`}>
              Record return
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
