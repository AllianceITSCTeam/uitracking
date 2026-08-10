import { useState } from "react";
import { apiPost } from "./api-client.js";
import type { HistoryEntry } from "core/node";

type Props = {
  projectId: string | undefined;
  runId: string | undefined;
  reviewedAt: string | undefined;
  onReviewed: () => void;
};

export function ReviewButton({ projectId, runId, reviewedAt, onReviewed }: Props) {
  const [pending, setPending] = useState(false);

  if (!projectId || !runId) return null;

  const handleClick = async () => {
    setPending(true);
    try {
      await apiPost<HistoryEntry>(`/api/projects/${projectId}/runs/${runId}/review`);
      onReviewed();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="review_run_button"
      disabled={Boolean(reviewedAt) || pending}
      onClick={handleClick}
    >
      {reviewedAt ? "Đã review" : "Đánh dấu đã review"}
    </button>
  );
}
