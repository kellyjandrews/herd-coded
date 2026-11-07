"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MergeButton({
  repository,
  pullRequest,
}: {
  repository: string;
  pullRequest: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function merge() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${repository}/queue`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", pullRequest }),
      });
      const result = (await response.json()) as {
        merged?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Merge failed.");
      setMessage(
        result.merged
          ? "Merged; production is deploying."
          : "CI is running; it merges and deploys when CI passes.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Merge failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className="button button-primary button-small"
        type="button"
        disabled={busy}
        aria-label={`Merge PR #${pullRequest}`}
        onClick={() => void merge()}
      >
        {busy ? "Merging…" : "Merge"}
      </button>
      {message && <span role="status">{message}</span>}
    </>
  );
}
