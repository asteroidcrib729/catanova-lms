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
import type { BookRequestView, FeedbackView, Principal } from "@/lib/api/types";

import { ui } from "@/lib/ui";

export function EngagementPanel({ principal }: { principal: Principal }) {
  const requests = useResource<BookRequestView[]>(
    "/api/v1/engagement/book-requests?limit=100",
  );
  const feedback = useResource<FeedbackView[]>(
    "/api/v1/engagement/feedback?limit=100",
  );
  const command = useCommand();
  const isStaff = principal.role !== "member";
  const refresh = () => {
    requests.retry();
    feedback.retry();
  };

  async function submit(
    event: FormEvent<HTMLFormElement>,
    type: "request" | "feedback",
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await command.execute({
      method: "POST",
      path:
        type === "request"
          ? "/api/v1/engagement/book-requests"
          : "/api/v1/engagement/feedback",
      body:
        type === "request"
          ? {
              title: String(data.get("title")),
              author: String(data.get("author")),
              publication_year: data.get("year")
                ? Number(data.get("year"))
                : null,
            }
          : { content: String(data.get("content")) },
      successMessage:
        type === "request" ? "Book request submitted." : "Feedback submitted.",
      onSuccess: () => {
        form.reset();
        refresh();
      },
    });
  }

  async function acquire(event: FormEvent<HTMLFormElement>, requestId: number) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await command.execute({
      method: "POST",
      path: `/api/v1/engagement/book-requests/${requestId}/acquire`,
      body: { book_id: Number(data.get("bookId")) },
      successMessage: "Acquisition linked to the catalog.",
      onSuccess: refresh,
    });
  }

  return (
    <div className={ui.panelStack}>
      <header className={ui.panelHeading}>
        <div>
          <p className={ui.eyebrow}>Requests & feedback</p>
          <h2 className={ui.panelTitle}>Help shape the collection</h2>
          <p className={ui.panelDescription}>
            Request books and keep a transparent record of responses.
          </p>
        </div>
      </header>
      <CommandNotice state={command.state} retry={command.retry} />
      <div className={ui.formGrid}>
        <form
          className={ui.workForm}
          onSubmit={(event) => void submit(event, "request")}
        >
          <h3 className={ui.cardTitle}>Request a book</h3>
          <label className={ui.label}>
            Title
            <input className={ui.input} name="title" required maxLength={300} />
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
            Publication year (optional)
            <input
              className={ui.input}
              name="year"
              type="number"
              min={1}
              max={9999}
            />
          </label>
          <button className={`${ui.button} ${ui.primary}`}>
            Submit request
          </button>
        </form>
        <form
          className={ui.workForm}
          onSubmit={(event) => void submit(event, "feedback")}
        >
          <h3 className={ui.cardTitle}>Share feedback</h3>
          <label className={ui.label}>
            Your message
            <textarea
              className={`${ui.input} min-h-[100px] resize-y`}
              name="content"
              required
              maxLength={4000}
            />
          </label>
          <button className={`${ui.button} ${ui.primary}`}>
            Submit feedback
          </button>
        </form>
      </div>

      <section>
        <h3 className={ui.cardTitle}>Book requests</h3>
        {requests.phase === "loading" || requests.phase === "waking" ? (
          <LoadingState waking={requests.phase === "waking"} />
        ) : requests.phase === "error" ? (
          <ErrorState error={requests.error} retry={requests.retry} />
        ) : requests.data.length === 0 ? (
          <EmptyState>No book requests yet.</EmptyState>
        ) : (
          <ul className={ui.recordList}>
            {requests.data.map((item) => (
              <li className={ui.record} key={item.request.id}>
                <div>
                  <strong>{item.request.title}</strong>
                  <span className={ui.recordDetail}>
                    {item.request.author} · {item.username} ·{" "}
                    {item.request.status}
                  </span>
                  {item.request.review_note ? (
                    <small className={ui.recordDetail}>
                      {item.request.review_note}
                    </small>
                  ) : null}
                  {item.acquired_book_title ? (
                    <small className={ui.recordDetail}>
                      Catalog title: {item.acquired_book_title}
                    </small>
                  ) : null}
                </div>
                {isStaff && item.request.status === "pending" ? (
                  <div className={ui.inlineActions}>
                    <button
                      className={ui.textButton}
                      type="button"
                      onClick={() =>
                        void command.execute({
                          method: "POST",
                          path: `/api/v1/engagement/book-requests/${item.request.id}/review`,
                          body: { status: "approved" },
                          successMessage: "Request approved.",
                          onSuccess: refresh,
                        })
                      }
                    >
                      Approve
                    </button>
                    <button
                      className={ui.textButtonDanger}
                      type="button"
                      onClick={() =>
                        void command.execute({
                          method: "POST",
                          path: `/api/v1/engagement/book-requests/${item.request.id}/review`,
                          body: {
                            status: "rejected",
                            note: "Not selected for the collection",
                          },
                          successMessage: "Request rejected.",
                          onSuccess: refresh,
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                ) : isStaff && item.request.status === "approved" ? (
                  <form
                    className={ui.inlineActions}
                    onSubmit={(event) => void acquire(event, item.request.id)}
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
                    <button
                      className={ui.textButton}
                      disabled={command.state.phase === "pending"}
                    >
                      Mark acquired
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className={ui.cardTitle}>Feedback</h3>
        {feedback.phase === "loading" || feedback.phase === "waking" ? (
          <LoadingState waking={feedback.phase === "waking"} />
        ) : feedback.phase === "error" ? (
          <ErrorState error={feedback.error} retry={feedback.retry} />
        ) : feedback.data.length === 0 ? (
          <EmptyState>No feedback yet.</EmptyState>
        ) : (
          <ul className={ui.recordList}>
            {feedback.data.map((item) => (
              <li className={ui.record} key={item.feedback.id}>
                <div>
                  <strong>{item.username}</strong>
                  <span className={`${ui.recordDetail} wrap-anywhere`}>
                    {item.feedback.content}
                  </span>
                  <small className={ui.recordDetail}>
                    {item.feedback.status}
                  </small>
                </div>
                {isStaff && item.feedback.status !== "archived" ? (
                  <button
                    className={ui.textButton}
                    type="button"
                    onClick={() =>
                      void command.execute({
                        method: "POST",
                        path: `/api/v1/engagement/feedback/${item.feedback.id}/${item.feedback.status === "new" ? "review" : "archive"}`,
                        successMessage:
                          item.feedback.status === "new"
                            ? "Feedback reviewed."
                            : "Feedback archived.",
                        onSuccess: refresh,
                      })
                    }
                  >
                    {item.feedback.status === "new"
                      ? "Mark reviewed"
                      : "Archive"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
