import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "./api-client.js";
import type { CaptureJobState } from "./capture-job-runner.js";

type TriggerResponse = { job: CaptureJobState; alreadyRunning: boolean };

type Props = {
  projectId: string | undefined;
  onRunFinished: (runId: string | undefined) => void;
};

const POLL_INTERVAL_MS = 2000;

export function TriggerRunButton({ projectId, onRunFinished }: Props) {
  const [job, setJob] = useState<CaptureJobState | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const pollingRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    setJob(undefined);
    setNotice(undefined);
    setError(undefined);
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, [projectId]);

  if (!projectId) return null;

  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      apiGet<CaptureJobState | null>(`/api/projects/${projectId}/capture-job`)
        .then((latest) => {
          if (!latest) return;
          setJob(latest);
          if (latest.status !== "running") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (latest.status === "succeeded" && latest.projectId === projectId) {
              onRunFinished(latest.runId);
            }
          }
        })
        .catch((err: unknown) => {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(err instanceof Error ? err.message : String(err));
        });
    }, POLL_INTERVAL_MS);
  };

  const handleClick = async () => {
    setNotice(undefined);
    setError(undefined);
    try {
      const result = await apiPost<TriggerResponse>(`/api/projects/${projectId}/capture-job`);
      setJob(result.job);
      if (result.alreadyRunning) {
        setNotice(`Đang chạy capture cho project "${result.job.projectId}" — vui lòng đợi rồi thử lại.`);
        return;
      }
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isRunning = job?.status === "running";

  return (
    <div className="space-y-1">
      <button
        type="button"
        data-testid="trigger_run_button"
        disabled={isRunning}
        onClick={handleClick}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isRunning ? "Đang chạy capture…" : "Chạy capture"}
      </button>
      {notice ? <p className="text-sm text-slate-600">{notice}</p> : null}
      {job?.status === "failed" ? (
        <p className="text-sm text-red-600">Capture thất bại{job.errorMessage ? `: ${job.errorMessage}` : ""}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">Lỗi khi gọi capture: {error}</p> : null}
    </div>
  );
}
