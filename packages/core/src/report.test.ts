import { describe, expect, it } from "vitest";
import { buildReport, type RunReport } from "./report.js";

function makeRunReport(overrides: Partial<RunReport> = {}): RunReport {
  return {
    runId: "run-1",
    project: "fixture-app",
    screenId: "customer-edit",
    locale: "vi",
    changes: [],
    controls: [],
    ...overrides,
  };
}

describe("buildReport", () => {
  it("tallies severityCounts across all changes in all screens", () => {
    const screens: RunReport[] = [
      makeRunReport({
        changes: [
          { changeType: "LOCATOR_BROKEN", key: "table.customers", before: null, after: null, severity: "CRITICAL" },
          { changeType: "TEXT_CHANGED", key: "field.email", before: "a", after: "b", severity: "MINOR" },
        ],
      }),
      makeRunReport({
        screenId: "customer-list",
        changes: [
          { changeType: "CONTROL_ADDED", key: "btn.export", before: null, after: null, severity: "INFO" },
        ],
      }),
    ];

    const report = buildReport("run-1", "fixture-app", "2026-08-10T00:00:00.000Z", "2026-08-10T00:00:05.000Z", screens);

    expect(report).toEqual({
      runId: "run-1",
      project: "fixture-app",
      startedAt: "2026-08-10T00:00:00.000Z",
      finishedAt: "2026-08-10T00:00:05.000Z",
      screens,
      severityCounts: { CRITICAL: 1, MAJOR: 0, MINOR: 1, INFO: 1 },
    });
  });

  it("returns all-zero severityCounts when there are no screens", () => {
    const report = buildReport("run-1", "fixture-app", "2026-08-10T00:00:00.000Z", "2026-08-10T00:00:05.000Z", []);

    expect(report.severityCounts).toEqual({ CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 0 });
  });
});
