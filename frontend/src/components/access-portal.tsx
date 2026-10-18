"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useSession } from "@/components/session-provider";
import { apiRequest } from "@/lib/api/request";
import { ApiError, type Principal } from "@/lib/api/types";
import { ui } from "@/lib/ui";

type Mode = "bootstrap" | "login" | "register";

export function AccessPortal() {
  const modes: readonly Mode[] =
    process.env.NODE_ENV === "production"
      ? ["login", "register"]
      : ["login", "register", "bootstrap"];
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  useEffect(() => {
    if (session.phase === "signed-in") router.replace("/dashboard");
  }, [router, session.phase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    setSuccess(undefined);
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "");
    const password = String(data.get("password") ?? "");
    try {
      if (mode === "login") {
        await session.login(username, password);
        router.replace("/dashboard");
        return;
      }
      const path =
        mode === "bootstrap"
          ? "/api/v1/accounts/bootstrap-administrator"
          : "/api/v1/accounts/register";
      await apiRequest<Principal>(path, {
        method: "POST",
        body: {
          display_name: String(data.get("displayName") ?? ""),
          username,
          password,
        },
      });
      setSuccess(
        mode === "bootstrap"
          ? "Administrator created. You can now sign in."
          : "Membership created. You can now sign in.",
      );
      setMode("login");
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "The request could not be completed.",
      );
    } finally {
      setPending(false);
    }
  }

  if (session.phase === "checking" || session.phase === "waking") {
    return (
      <div
        className={`${ui.accessCard} content-center justify-items-start`}
        role="status"
        aria-live="polite"
      >
        <span className={ui.spinner} aria-hidden="true" />
        <div>
          <strong>
            {session.phase === "waking"
              ? "Waking CataNova"
              : "Checking your session"}
          </strong>
          <p>
            Finding your place in CataNova. New here? You can join once this
            check completes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className={ui.accessCard} aria-labelledby="access-title">
      <div
        className={`grid ${modes.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-1 rounded-xl bg-border/62 p-1`}
        role="tablist"
        aria-label="Account access"
      >
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            className="rounded-[9px] border-0 bg-transparent p-2 text-[0.8rem] font-[680] text-muted aria-selected:bg-surface aria-selected:text-foreground aria-selected:shadow-[0_2px_8px_rgb(0_0_0/7%)]"
            aria-selected={mode === item}
            onClick={() => {
              setMode(item);
              setError(undefined);
              setSuccess(undefined);
            }}
          >
            {item === "login"
              ? "Sign in"
              : item === "register"
                ? "Join"
                : "First setup"}
          </button>
        ))}
      </div>
      <div>
        <p className={ui.eyebrow}>
          {mode === "bootstrap" ? "One-time setup" : "Your CataNova workspace"}
        </p>
        <h2
          id="access-title"
          className="text-[clamp(1.7rem,4vw,2.4rem)] font-semibold tracking-[-0.045em]"
        >
          {mode === "login"
            ? "Welcome back"
            : mode === "register"
              ? "Create your membership"
              : "Create the first administrator"}
        </h2>
        <p className="mt-3 text-[0.82rem] leading-[1.65] text-muted">
          {mode === "login"
            ? "Your collection, your community, your next discovery."
            : mode === "register"
              ? "A whole world of reading starts with your membership."
              : "Give your library its first CataNova administrator."}
        </p>
      </div>
      <form
        className={ui.form}
        onSubmit={submit}
        aria-describedby="form-notice"
      >
        {mode !== "login" ? (
          <label className={ui.label}>
            Display name
            <input
              className={ui.input}
              name="displayName"
              autoComplete="name"
              required
              maxLength={100}
            />
          </label>
        ) : null}
        <label className={ui.label}>
          Username
          <input
            className={ui.input}
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
          />
        </label>
        <label className={ui.label}>
          Password
          <input
            className={ui.input}
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
          />
        </label>
        <button className={`${ui.button} ${ui.primary}`} disabled={pending}>
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Enter dashboard"
              : mode === "register"
                ? "Create membership"
                : "Create administrator"}
        </button>
        <div id="form-notice" aria-live="polite">
          {error ? <p className={ui.noticeError}>{error}</p> : null}
          {success ? <p className={ui.noticeSuccess}>{success}</p> : null}
          {session.phase === "unavailable" ? (
            <div className={ui.noticeError}>
              <span>
                {session.error?.message ?? "The service is not available."}
              </span>
              <button
                className={ui.noticeAction}
                type="button"
                onClick={session.refresh}
              >
                Check again
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
}
