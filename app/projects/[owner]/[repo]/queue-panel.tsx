"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QueueStatus, Section } from "@/lib/server/types";

export default function QueuePanel({
  repository,
  queue,
}: {
  repository: string;
  queue: Section<QueueStatus>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  async function send(path: string, body: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(result.error ?? "Request failed."));
      router.refresh();
      return result;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function control(action: "pause" | "resume" | "retry") {
    const result = await send(`/api/projects/${repository}/queue`, { action });
    if (result) {
      setMessage(
        action === "pause"
          ? "Queue paused. Copilot finishes its current feature but won't start the next one."
          : action === "resume"
            ? "Queue resumed."
            : "Queue run started. Copilot picks up the next feature if none is in progress.",
      );
    }
  }

  async function addFeature(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await send("/api/features", { repository, title, details });
    if (result) {
      setTitle("");
      setDetails("");
      setMessage(
        result.queued
          ? `Queued${result.position ? ` at position ${result.position}` : ""}.`
          : "Assigned to Copilot directly (this project has no feature queue).",
      );
    }
  }

  const status = queue.ok ? queue.data : null;

  return (
    <section className="detail-card" aria-labelledby="queue-title" data-testid="queue-panel">
      <div className="section-heading">
        <h2 id="queue-title">
          Feature queue{" "}
          {status?.paused && (
            <span className="status-pill status-paused" data-testid="queue-paused">
              Paused
            </span>
          )}
        </h2>
        {status?.enabled && (
          <div className="queue-actions">
            {status.paused ? (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => void control("resume")}
              >
                Resume
              </button>
            ) : (
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => void control("pause")}
              >
                Pause
              </button>
            )}
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => void control("retry")}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {!queue.ok ? (
        <p className="section-error" role="status">
          {queue.error}
        </p>
      ) : !queue.data.enabled ? (
        <p className="section-empty">
          This project has no Feature queue workflow, so new features are assigned to Copilot
          directly. Run Repair from the dashboard to add it.
        </p>
      ) : queue.data.items.length === 0 ? (
        <p className="section-empty">The queue is empty.</p>
      ) : (
        <ol className="queue-list" data-testid="queue-list">
          {queue.data.items.map((item) => (
            <li key={item.number} data-testid="queue-item">
              <span className="queue-position">{item.position}</span>
              <a href={item.url} target="_blank" rel="noreferrer">
                #{item.number} {item.title}
              </a>
              {item.assignedToCopilot && (
                <span className="status-pill status-working">Copilot working</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <form className="feature-form queue-form" onSubmit={(event) => void addFeature(event)}>
        <input
          aria-label="New feature title"
          required
          maxLength={200}
          placeholder="Feature title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          aria-label="New feature details"
          required
          rows={3}
          maxLength={60000}
          placeholder="What should users be able to do? Include acceptance criteria."
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <div className="create-actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Working…" : "Add to queue"}
          </button>
        </div>
      </form>

      {message && (
        <p className="feature-result" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="section-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
