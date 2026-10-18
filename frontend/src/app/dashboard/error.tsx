"use client";

import { ui } from "@/lib/ui";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className={ui.centerPage}>
      <div className={ui.stateCardError} role="alert">
        <div>
          <strong>The dashboard encountered an unexpected problem</strong>
          <p className="text-muted">
            Your session and saved library data have not been changed.
          </p>
        </div>
        <button
          className={`${ui.button} ${ui.secondary}`}
          type="button"
          onClick={reset}
        >
          Try this view again
        </button>
      </div>
    </main>
  );
}
