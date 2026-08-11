import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCurrentCaptureJob,
  resetCaptureJobForTest,
  triggerCaptureJob,
  type CaptureJobState,
} from "./capture-job-runner.js";

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("capture-job-runner", () => {
  afterEach(() => {
    resetCaptureJobForTest();
  });

  it("trigger → running, then reflects success + runId once the pipeline resolves", async () => {
    const pending = deferred<{ ok: boolean; runId?: string }>();
    const pipeline = vi.fn().mockReturnValue(pending.promise);

    const { job, alreadyRunning } = triggerCaptureJob("workspace", "fixture-app", pipeline);

    expect(alreadyRunning).toBe(false);
    expect(job.status).toBe("running");
    expect(job.projectId).toBe("fixture-app");
    expect(getCurrentCaptureJob()?.status).toBe("running");

    pending.resolve({ ok: true, runId: "run-1" });
    await pending.promise;
    await Promise.resolve();

    const finished = getCurrentCaptureJob() as CaptureJobState;
    expect(finished.status).toBe("succeeded");
    expect(finished.runId).toBe("run-1");
    expect(finished.finishedAt).toBeDefined();
  });

  it("trigger while another job is running returns the in-flight job instead of starting a second one", async () => {
    const pending = deferred<{ ok: boolean; runId?: string }>();
    const pipeline = vi.fn().mockReturnValue(pending.promise);

    triggerCaptureJob("workspace", "fixture-app", pipeline);
    const second = triggerCaptureJob("workspace", "other-project", pipeline);

    expect(second.alreadyRunning).toBe(true);
    expect(second.job.projectId).toBe("fixture-app");
    expect(pipeline).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true });
    await pending.promise;
  });
});
