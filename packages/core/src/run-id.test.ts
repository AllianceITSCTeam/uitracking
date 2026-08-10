import { describe, expect, it } from "vitest";
import { generateRunId } from "./run-id.js";
import { sanitizeIdSegment } from "./paths.js";

describe("generateRunId", () => {
  it("derives a sortable, filesystem-safe id from the given timestamp", () => {
    const runId = generateRunId(new Date("2026-08-10T09:15:30.123Z"));

    expect(runId).toBe("2026-08-10T09-15-30-123Z");
    expect(() => sanitizeIdSegment(runId)).not.toThrow();
  });

  it("defaults to the current time when no date is given", () => {
    const runId = generateRunId();

    expect(() => sanitizeIdSegment(runId)).not.toThrow();
  });
});
