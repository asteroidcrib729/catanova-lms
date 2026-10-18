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
import type { FineView, Principal } from "@/lib/api/types";

import { ui } from "@/lib/ui";

export function FinancePanel({ principal }: { principal: Principal }) {
  const fines = useResource<FineView[]>("/api/v1/finance/fines?limit=100");
  const command = useCommand();
  const isStaff = principal.role !== "member";

  async function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await command.execute({
      method: "POST",
      path: "/api/v1/finance/fines",
      body: {
        username: String(data.get("username")),
        amount: String(data.get("amount")),
        reason: String(data.get("reason")),
      },
      successMessage: "Fine assessed.",
      onSuccess: () => {
        form.reset();
        fines.retry();
      },
    });
  }

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Finance</p>
          <h2 className={ui.panelTitle}>Fine history</h2>
          <p className={ui.panelDescription}>
            See every charge and its settlement status.
          </p>
        </div>
      </header>
      <CommandNotice state={command.state} retry={command.retry} />
      {fines.phase === "loading" || fines.phase === "waking" ? (
        <LoadingState waking={fines.phase === "waking"} />
      ) : fines.phase === "error" ? (
        <ErrorState error={fines.error} retry={fines.retry} />
      ) : fines.data.length === 0 ? (
        <EmptyState>No fines are recorded for this account.</EmptyState>
      ) : (
        <div className={ui.grid}>
          {fines.data.map((item) => (
            <article className={ui.metricCard} key={item.fine.id}>
              <div className={ui.inlineActions}>
                <span
                  className={
                    item.fine.status === "outstanding"
                      ? ui.badgeDanger
                      : ui.badge
                  }
                >
                  {item.fine.status}
                </span>
                <strong>PKR {item.fine.amount}</strong>
              </div>
              <h3 className={ui.cardTitle}>{item.fine.reason}</h3>
              <p className="text-muted">
                {item.username} · {formatDate(item.fine.assessed_at)}
              </p>
              {isStaff && item.fine.status === "outstanding" ? (
                <div className={ui.inlineActions}>
                  <button
                    className={ui.textButton}
                    type="button"
                    onClick={() =>
                      void command.execute({
                        method: "POST",
                        path: `/api/v1/finance/fines/${item.fine.id}/payment`,
                        body: {},
                        successMessage: "Payment recorded.",
                        onSuccess: fines.retry,
                      })
                    }
                  >
                    Record paid
                  </button>
                  {principal.role === "administrator" ? (
                    <button
                      className={ui.textButtonDanger}
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Waive this fine? This creates a permanent settlement record.",
                          )
                        )
                          void command.execute({
                            method: "POST",
                            path: `/api/v1/finance/fines/${item.fine.id}/waiver`,
                            body: { reason: "Administrator-approved waiver" },
                            successMessage: "Fine waived.",
                            onSuccess: fines.retry,
                          });
                      }}
                    >
                      Waive
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {isStaff ? (
        <details className={ui.workForm}>
          <summary className="cursor-pointer font-bold in-open:mb-5">
            Assess a manual fine
          </summary>
          <form className={ui.form} onSubmit={assess}>
            <div className={ui.formGrid}>
              <label className={ui.label}>
                Member username
                <input className={ui.input} name="username" required />
              </label>
              <label className={ui.label}>
                Amount (PKR)
                <input
                  className={ui.input}
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
            </div>
            <label className={ui.label}>
              Reason
              <textarea
                className={`${ui.input} min-h-[100px] resize-y`}
                name="reason"
                required
                maxLength={500}
              />
            </label>
            <button className={`${ui.button} ${ui.primary}`}>
              Assess fine
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
