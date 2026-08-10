import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendHistoryEntry, markRunReviewed } from "./history.js";

describe("appendHistoryEntry", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-history-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("creates history.json with one entry when none exists yet", () => {
    const result = appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-1",
      capturedAt: "2026-08-10T00:00:00.000Z",
    });

    expect(result).toEqual([{ runId: "run-1", capturedAt: "2026-08-10T00:00:00.000Z" }]);
  });

  it("appends a second entry after the first, preserving order", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-1",
      capturedAt: "2026-08-10T00:00:00.000Z",
    });

    const result = appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-2",
      capturedAt: "2026-08-10T01:00:00.000Z",
    });

    expect(result.map((e) => e.runId)).toEqual(["run-1", "run-2"]);
  });

  it("throws when appending a duplicate runId", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-1",
      capturedAt: "2026-08-10T00:00:00.000Z",
    });

    expect(() =>
      appendHistoryEntry(workspaceRoot, "fixture-app", {
        runId: "run-1",
        capturedAt: "2026-08-10T01:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("markRunReviewed", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-history-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("sets reviewedAt on the matching entry without touching others", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-1",
      capturedAt: "2026-08-10T00:00:00.000Z",
    });
    appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-2",
      capturedAt: "2026-08-10T01:00:00.000Z",
    });

    const result = markRunReviewed(workspaceRoot, "fixture-app", "run-1");

    const run1 = result.find((e) => e.runId === "run-1");
    const run2 = result.find((e) => e.runId === "run-2");
    expect(run1?.reviewedAt).toEqual(expect.any(String));
    expect(run2?.reviewedAt).toBeUndefined();
  });

  it("throws when runId does not exist", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", {
      runId: "run-1",
      capturedAt: "2026-08-10T00:00:00.000Z",
    });

    expect(() => markRunReviewed(workspaceRoot, "fixture-app", "run-missing")).toThrow();
  });
});
