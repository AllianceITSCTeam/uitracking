import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Report } from "./report.js";
import type { Screen } from "./snapshot.js";
import { writeReport, writeReportHtml, writeScreenshot, writeSnapshot } from "./storage-writer.js";

const SCREEN: Screen = {
  id: "customer-edit",
  locale: "vi",
  capturedAt: "2026-08-10T00:00:00.000Z",
  controls: [],
};

const REPORT: Report = {
  runId: "run-1",
  project: "fixture-app",
  startedAt: "2026-08-10T00:00:00.000Z",
  finishedAt: "2026-08-10T00:00:05.000Z",
  screens: [],
  severityCounts: { CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 0 },
};

describe("writeSnapshot / writeScreenshot", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-storage-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("writes a snapshot JSON file with matching checksum and size", () => {
    const result = writeSnapshot(workspaceRoot, "fixture-app", "run-1", SCREEN);

    const written = readFileSync(result.path, "utf-8");
    expect(written).toBe(JSON.stringify(SCREEN));
    expect(result.checksum).toBe(createHash("sha256").update(written).digest("hex"));
    expect(result.size).toBe(Buffer.byteLength(written));
    expect(result.path.endsWith("runs/run-1/snapshots/customer-edit.vi.json")).toBe(true);
  });

  it("throws when writing a snapshot to a path that already exists", () => {
    writeSnapshot(workspaceRoot, "fixture-app", "run-1", SCREEN);

    expect(() => writeSnapshot(workspaceRoot, "fixture-app", "run-1", SCREEN)).toThrow();
  });

  it("writes a screenshot buffer with a checksum over the binary bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const result = writeScreenshot(workspaceRoot, "fixture-app", "run-1", "customer-edit", "vi", png);

    const written = readFileSync(result.path);
    expect(written.equals(png)).toBe(true);
    expect(result.checksum).toBe(createHash("sha256").update(png).digest("hex"));
    expect(result.size).toBe(png.length);
  });

  it("writes a report.json file with matching checksum and throws on overwrite", () => {
    const result = writeReport(workspaceRoot, "fixture-app", "run-1", REPORT);

    const written = readFileSync(result.path, "utf-8");
    expect(written).toBe(JSON.stringify(REPORT));
    expect(result.checksum).toBe(createHash("sha256").update(written).digest("hex"));
    expect(result.path.endsWith("runs/run-1/report.json")).toBe(true);
    expect(() => writeReport(workspaceRoot, "fixture-app", "run-1", REPORT)).toThrow();
  });

  it("writes a report.html file and throws on overwrite", () => {
    const html = "<html><body>report</body></html>";
    const result = writeReportHtml(workspaceRoot, "fixture-app", "run-1", html);

    const written = readFileSync(result.path, "utf-8");
    expect(written).toBe(html);
    expect(result.path.endsWith("runs/run-1/report.html")).toBe(true);
    expect(() => writeReportHtml(workspaceRoot, "fixture-app", "run-1", html)).toThrow();
  });
});
