import { join } from "node:path/posix";

const ID_SEGMENT_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/;

/**
 * Chặn path traversal: chỉ chấp nhận id gồm chữ/số/`.`/`_`/`-`, không rỗng,
 * không bắt đầu/kết thúc bằng `.`/`-` (chặn `..`), không chứa separator hay null byte.
 */
export function sanitizeIdSegment(id: string): string {
  if (!ID_SEGMENT_PATTERN.test(id)) {
    throw new Error(`Invalid id segment: ${JSON.stringify(id)}`);
  }
  return id;
}

export function buildProjectDir(workspaceRoot: string, projectId: string): string {
  return join(workspaceRoot, "projects", sanitizeIdSegment(projectId));
}

/** Đường dẫn `config` trong `workspace/projects.yaml` — relative tới workspace root. */
export function buildProjectConfigRelativePath(projectId: string): string {
  return join("projects", sanitizeIdSegment(projectId), "screens.config.yaml");
}

export function buildBaselinePath(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  locale: string,
): string {
  return join(
    buildProjectDir(workspaceRoot, projectId),
    "baseline",
    `${sanitizeIdSegment(screenId)}.${sanitizeIdSegment(locale)}.json`,
  );
}

export function buildRunDir(workspaceRoot: string, projectId: string, runId: string): string {
  return join(buildProjectDir(workspaceRoot, projectId), "runs", sanitizeIdSegment(runId));
}

export function buildSnapshotPath(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  screenId: string,
  locale: string,
): string {
  return join(
    buildRunDir(workspaceRoot, projectId, runId),
    "snapshots",
    `${sanitizeIdSegment(screenId)}.${sanitizeIdSegment(locale)}.json`,
  );
}

export function buildScreenshotPath(
  workspaceRoot: string,
  projectId: string,
  runId: string,
  screenId: string,
  locale: string,
): string {
  return join(
    buildRunDir(workspaceRoot, projectId, runId),
    "screenshots",
    `${sanitizeIdSegment(screenId)}.${sanitizeIdSegment(locale)}.png`,
  );
}

export function buildReportPath(workspaceRoot: string, projectId: string, runId: string): string {
  return join(buildRunDir(workspaceRoot, projectId, runId), "report.json");
}

export function buildReportHtmlPath(workspaceRoot: string, projectId: string, runId: string): string {
  return join(buildRunDir(workspaceRoot, projectId, runId), "report.html");
}
