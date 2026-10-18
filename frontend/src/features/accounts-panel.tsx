"use client";

import { type FormEvent } from "react";

import { CommandNotice } from "@/components/async-state";
import { useCommand } from "@/hooks/use-command";

import { ui } from "@/lib/ui";

export function AccountsPanel() {
  const command = useCommand();

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: "create" | "deactivate",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await command.execute({
      method: "POST",
      path:
        action === "create"
          ? "/api/v1/accounts/librarians"
          : "/api/v1/accounts/deactivate",
      body:
        action === "create"
          ? {
              display_name: String(data.get("displayName")),
              username: String(data.get("username")),
              password: String(data.get("password")),
            }
          : { username: String(data.get("username")) },
      successMessage:
        action === "create"
          ? "Librarian account created."
          : "Account deactivated.",
      onSuccess: () => form.reset(),
    });
  }

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Administration</p>
          <h2 className={ui.panelTitle}>Account controls</h2>
          <p className={ui.panelDescription}>
            Create staff access and deactivate accounts with an auditable
            server-side decision.
          </p>
        </div>
      </header>
      <CommandNotice state={command.state} retry={command.retry} />
      <div className={ui.formGrid}>
        <form
          className={ui.workForm}
          onSubmit={(event) => void submit(event, "create")}
        >
          <h3 className={ui.cardTitle}>Create librarian</h3>
          <label className={ui.label}>
            Display name
            <input
              className={ui.input}
              name="displayName"
              required
              maxLength={100}
            />
          </label>
          <label className={ui.label}>
            Username
            <input
              className={ui.input}
              name="username"
              required
              minLength={3}
              maxLength={32}
            />
          </label>
          <label className={ui.label}>
            Temporary password
            <input
              className={ui.input}
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <button className={`${ui.button} ${ui.primary}`}>
            Create librarian
          </button>
        </form>
        <form
          className={ui.workFormDanger}
          onSubmit={(event) => {
            event.preventDefault();
            if (
              window.confirm(
                "Deactivate this account and revoke all of its active sessions?",
              )
            )
              void submit(event, "deactivate");
          }}
        >
          <h3 className={ui.cardTitle}>Deactivate account</h3>
          <p>
            This immediately revokes every active browser session for the
            account.
          </p>
          <label className={ui.label}>
            Username
            <input
              className={ui.input}
              name="username"
              required
              minLength={3}
              maxLength={32}
            />
          </label>
          <button className={`${ui.button} ${ui.danger}`}>
            Deactivate account
          </button>
        </form>
      </div>
    </div>
  );
}
