"use client";

import { EmptyState, ErrorState, LoadingState } from "@/components/async-state";
import { useResource } from "@/hooks/use-resource";
import type {
  OperationalReport,
  PopularBook,
  Principal,
  Recommendation,
} from "@/lib/api/types";

import { ui } from "@/lib/ui";

export function InsightsPanel({ principal }: { principal: Principal }) {
  const recommendations = useResource<Recommendation[]>(
    "/api/v1/insights/recommendations?limit=6",
  );
  const popular = useResource<PopularBook[]>(
    "/api/v1/insights/popular?limit=6",
  );
  const report = useResource<OperationalReport>(
    "/api/v1/insights/operations",
    principal.role !== "member",
  );

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Overview</p>
          <h2 className={ui.panelTitle}>
            Good {dayPart()}, {principal.display_name.split(" ")[0]}
          </h2>
          <p className={ui.panelDescription}>
            Start with what needs attention, then discover what readers are
            enjoying.
          </p>
        </div>
      </header>
      {principal.role !== "member" ? (
        <section aria-labelledby="operations-title">
          <h3 className={ui.cardTitle} id="operations-title">
            Library today
          </h3>
          {report.phase === "loading" || report.phase === "waking" ? (
            <LoadingState waking={report.phase === "waking"} />
          ) : report.phase === "error" ? (
            <ErrorState error={report.error} retry={report.retry} />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-3">
              <Metric label="Active loans" value={report.data.active_loans} />
              <Metric
                label="Overdue"
                value={report.data.overdue_loans}
                tone={report.data.overdue_loans ? "alert" : undefined}
              />
              <Metric
                label="Reservations"
                value={report.data.active_reservations}
              />
              <Metric
                label="Pending requests"
                value={report.data.pending_requests}
              />
              <Metric
                label="Outstanding fines"
                value={`PKR ${report.data.outstanding_fine_amount}`}
              />
              <Metric
                label="Available copies"
                value={`${report.data.available_copies}/${report.data.total_copies}`}
              />
            </div>
          )}
        </section>
      ) : null}
      <section aria-labelledby="recommend-title">
        <h3 className={ui.cardTitle} id="recommend-title">
          Picked for you
        </h3>
        {recommendations.phase === "loading" ||
        recommendations.phase === "waking" ? (
          <LoadingState waking={recommendations.phase === "waking"} />
        ) : recommendations.phase === "error" ? (
          <ErrorState
            error={recommendations.error}
            retry={recommendations.retry}
          />
        ) : recommendations.data.length === 0 ? (
          <EmptyState>
            Borrowing history will shape recommendations over time.
          </EmptyState>
        ) : (
          <div className={ui.grid}>
            {recommendations.data.map((item) => (
              <article className={ui.metricCard} key={item.book.id}>
                <p className={ui.meta}>{item.available_copies} available</p>
                <h3 className={ui.cardTitle}>{item.book.title}</h3>
                <p className="text-muted">{item.book.author}</p>
                <small className={ui.recordDetail}>{item.reason}</small>
              </article>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="popular-title">
        <h3 className={ui.cardTitle} id="popular-title">
          Popular now
        </h3>
        {popular.phase === "loading" || popular.phase === "waking" ? (
          <LoadingState waking={popular.phase === "waking"} />
        ) : popular.phase === "error" ? (
          <ErrorState error={popular.error} retry={popular.retry} />
        ) : popular.data.length === 0 ? (
          <EmptyState>
            Popular titles will appear after the first checkouts.
          </EmptyState>
        ) : (
          <ol className={ui.recordList}>
            {popular.data.map((item, index) => (
              <li className={ui.record} key={item.book.id}>
                <span className="font-mono text-accent-strong">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <strong>{item.book.title}</strong>
                  <small className={ui.recordDetail}>
                    {item.historical_checkouts} checkouts ·{" "}
                    {item.available_copies} available
                  </small>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "alert";
}) {
  return (
    <article className={tone ? ui.metricAlert : ui.metricCard}>
      <span className="text-[0.76rem] text-muted">{label}</span>
      <strong className="mt-3.5 block text-[1.45rem] font-bold">{value}</strong>
    </article>
  );
}

function dayPart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}
