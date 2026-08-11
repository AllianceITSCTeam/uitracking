import { runCaptureForProject, type CaptureRunResult } from "cli/run";

export type CaptureJobStatus = "running" | "succeeded" | "failed";

export type CaptureJobState = {
  projectId: string;
  status: CaptureJobStatus;
  startedAt: string;
  finishedAt?: string;
  runId?: string;
  errorMessage?: string;
};

export type TriggerCaptureJobResult = { job: CaptureJobState; alreadyRunning: boolean };

type CapturePipeline = (projectId: string, workspaceRoot: string) => Promise<CaptureRunResult>;

let currentJob: CaptureJobState | undefined;

/** Chỉ 1 capture job chạy toàn cục tại một thời điểm — packages/capture giữ 1 browser singleton. */
export function triggerCaptureJob(
  workspaceRoot: string,
  projectId: string,
  pipeline: CapturePipeline = runCaptureForProject,
): TriggerCaptureJobResult {
  if (currentJob?.status === "running") {
    return { job: currentJob, alreadyRunning: true };
  }

  const job: CaptureJobState = { projectId, status: "running", startedAt: new Date().toISOString() };
  currentJob = job;

  pipeline(projectId, workspaceRoot)
    .then((result) => {
      currentJob = {
        ...job,
        status: result.ok ? "succeeded" : "failed",
        finishedAt: new Date().toISOString(),
        runId: result.runId,
      };
    })
    .catch((error: unknown) => {
      currentJob = {
        ...job,
        status: "failed",
        finishedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    });

  return { job, alreadyRunning: false };
}

export function getCurrentCaptureJob(): CaptureJobState | undefined {
  return currentJob;
}

/** Chỉ dùng trong test để reset state module-level giữa các case. */
export function resetCaptureJobForTest(): void {
  currentJob = undefined;
}
