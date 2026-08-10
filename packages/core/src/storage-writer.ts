import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildReportHtmlPath, buildReportPath, buildScreenshotPath, buildSnapshotPath } from "./paths.js";
import type { Report } from "./report.js";
import type { Screen } from "./snapshot.js";

export type WriteResult = { path: string; checksum: string; size: number };

/** Ghi 1 artifact bất biến: `wx` chặn ghi đè nếu path đã tồn tại. */
function writeArtifact(path: string, data: string | Buffer): WriteResult {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, { flag: "wx" });

  return {
    path,
    checksum: createHash("sha256").update(data).digest("hex"),
    size: Buffer.byteLength(data),
  };
}

/** Ghi snapshot JSON của 1 screen vào `runs/<run-id>/snapshots/`. */
export function writeSnapshot(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  screen: Screen,
): WriteResult {
  const path = buildSnapshotPath(workspaceRoot, projectId, runId, screen.id, screen.locale);
  return writeArtifact(path, JSON.stringify(screen));
}

/** Ghi screenshot PNG (bằng chứng phụ, không dùng để diff) vào `runs/<run-id>/screenshots/`. */
export function writeScreenshot(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  screenId: string,
  locale: string,
  png: Buffer,
): WriteResult {
  const path = buildScreenshotPath(workspaceRoot, projectId, runId, screenId, locale);
  return writeArtifact(path, png);
}

/** Ghi `report.json` bất biến của 1 run vào `runs/<run-id>/report.json`. */
export function writeReport(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  report: Report,
): WriteResult {
  const path = buildReportPath(workspaceRoot, projectId, runId);
  return writeArtifact(path, JSON.stringify(report));
}

/** Ghi `report.html` bất biến của 1 run vào `runs/<run-id>/report.html`. */
export function writeReportHtml(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  html: string,
): WriteResult {
  const path = buildReportHtmlPath(workspaceRoot, projectId, runId);
  return writeArtifact(path, html);
}
