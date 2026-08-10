import { useEffect, useState } from "react";
import { apiGet } from "./api-client.js";
import type { HistoryEntry } from "core/node";

type Props = {
  projectId: string | undefined;
  runId: string | undefined;
  refreshToken: number;
  onSelectRun: (runId: string) => void;
  onRunsLoaded: (runs: HistoryEntry[]) => void;
};

export function RunTimeline({ projectId, runId, refreshToken, onSelectRun, onRunsLoaded }: Props) {
  const [runs, setRuns] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!projectId) {
      setRuns([]);
      onRunsLoaded([]);
      return;
    }
    apiGet<HistoryEntry[]>(`/api/projects/${projectId}/runs`)
      .then((loaded) => {
        setRuns(loaded);
        onRunsLoaded(loaded);
      })
      .catch(() => {
        setRuns([]);
        onRunsLoaded([]);
      });
  }, [projectId, refreshToken, onRunsLoaded]);

  if (!projectId) return null;

  return (
    <ul>
      {runs.map((run) => (
        <li key={run.runId}>
          <button
            type="button"
            data-testid="run_item_button"
            aria-current={run.runId === runId}
            onClick={() => onSelectRun(run.runId)}
          >
            {run.capturedAt} {run.reviewedAt ? "— Đã review" : ""}
          </button>
        </li>
      ))}
    </ul>
  );
}
