import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ScreensConfigSchema, LocatorsFileSchema } from "core";
import type { LocatorsFile, Report, ScreensConfig } from "core";
import {
  buildLocatorsFilePath,
  buildProjectConfigRelativePath,
  buildProjectDir,
  buildReportPath,
  buildScreensConfigPath,
  ensureScreensConfigStub,
  loadLocatorsFile,
  loadProjectsFile,
  loadScreensConfig,
  markRunReviewed,
  sanitizeIdSegment,
  writeLocatorsFile,
  writeProjectsFile,
  writeScreensConfig,
  type HistoryEntry,
} from "core/node";
import type { ProjectsFile } from "core";

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(code: string, status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type ProjectSummary = { id: string; name: string };

function loadProjectsFileOrThrow(workspaceRoot: string): ProjectsFile {
  const result = loadProjectsFile(join(workspaceRoot, "projects.yaml"));
  if (!result.ok) {
    throw new ApiError("PROJECTS_FILE_INVALID", 500, "workspace/projects.yaml không hợp lệ");
  }
  return result.data;
}

function requireProject(workspaceRoot: string, projectId: string): ProjectSummary {
  const file = loadProjectsFileOrThrow(workspaceRoot);

  const project = file.projects.find((entry) => entry.id === projectId);
  if (!project) {
    throw new ApiError("PROJECT_NOT_FOUND", 404, `Không tìm thấy project "${projectId}"`);
  }

  return { id: project.id, name: project.name };
}

function requireProjectName(name: unknown): string {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Tên project không được để trống", {
      name: ["Bắt buộc"],
    });
  }
  return name.trim();
}

function requireProjectId(id: unknown): string {
  if (typeof id !== "string" || id.length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Id project không được để trống", { id: ["Bắt buộc"] });
  }
  try {
    return sanitizeIdSegment(id);
  } catch {
    throw new ApiError("VALIDATION_ERROR", 400, `Id không hợp lệ: "${id}"`, {
      id: ["Chỉ chấp nhận chữ, số, '.', '_', '-'"],
    });
  }
}

function requireValidId(id: string): string {
  try {
    return sanitizeIdSegment(id);
  } catch {
    throw new ApiError("INVALID_ID", 400, `Id không hợp lệ: "${id}"`);
  }
}

function historyPath(workspaceRoot: string, projectId: string): string {
  return join(buildProjectDir(workspaceRoot, projectId), "history.json");
}

function readHistory(workspaceRoot: string, projectId: string): HistoryEntry[] {
  const path = historyPath(workspaceRoot, projectId);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8")) as HistoryEntry[];
}

export function listProjects(workspaceRoot: string): ProjectSummary[] {
  const file = loadProjectsFileOrThrow(workspaceRoot);
  return file.projects.map((entry) => ({ id: entry.id, name: entry.name }));
}

export function createProject(workspaceRoot: string, input: unknown): ProjectSummary {
  const body = (input ?? {}) as { id?: unknown; name?: unknown };
  const id = requireProjectId(body.id);
  const name = requireProjectName(body.name);

  const file = loadProjectsFileOrThrow(workspaceRoot);
  if (file.projects.some((p) => p.id === id)) {
    throw new ApiError("PROJECT_ID_DUPLICATE", 409, `Project "${id}" đã tồn tại`);
  }

  const entry = { id, name, config: buildProjectConfigRelativePath(id) };
  writeProjectsFile(workspaceRoot, { projects: [...file.projects, entry] });
  ensureScreensConfigStub(workspaceRoot, id);

  return { id, name };
}

export function updateProject(workspaceRoot: string, projectId: string, input: unknown): ProjectSummary {
  const id = requireValidId(projectId);
  const body = (input ?? {}) as { name?: unknown };
  const name = requireProjectName(body.name);

  const file = loadProjectsFileOrThrow(workspaceRoot);
  if (!file.projects.some((p) => p.id === id)) {
    throw new ApiError("PROJECT_NOT_FOUND", 404, `Không tìm thấy project "${id}"`);
  }

  const updatedProjects = file.projects.map((p) => (p.id === id ? { ...p, name } : p));
  writeProjectsFile(workspaceRoot, { projects: updatedProjects });

  return { id, name };
}

export function deleteProject(workspaceRoot: string, projectId: string): void {
  const id = requireValidId(projectId);

  const file = loadProjectsFileOrThrow(workspaceRoot);
  if (!file.projects.some((p) => p.id === id)) {
    throw new ApiError("PROJECT_NOT_FOUND", 404, `Không tìm thấy project "${id}"`);
  }
  if (file.projects.length === 1) {
    throw new ApiError("LAST_PROJECT_FORBIDDEN", 400, "Không thể xoá project cuối cùng");
  }

  writeProjectsFile(workspaceRoot, { projects: file.projects.filter((p) => p.id !== id) });
}

export function listRuns(workspaceRoot: string, projectId: string): HistoryEntry[] {
  const id = requireValidId(projectId);
  requireProject(workspaceRoot, id);
  return [...readHistory(workspaceRoot, id)].reverse();
}

export function getReport(workspaceRoot: string, projectId: string, runId: string): Report {
  const pId = requireValidId(projectId);
  const rId = requireValidId(runId);
  requireProject(workspaceRoot, pId);

  const path = buildReportPath(workspaceRoot, pId, rId);
  if (!existsSync(path)) {
    throw new ApiError("RUN_NOT_FOUND", 404, `Không tìm thấy run "${rId}" của project "${pId}"`);
  }

  return JSON.parse(readFileSync(path, "utf-8")) as Report;
}

function fieldErrorsFromZodIssues(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export function getScreensConfig(workspaceRoot: string, projectId: string): ScreensConfig {
  const id = requireValidId(projectId);
  requireProject(workspaceRoot, id);

  const result = loadScreensConfig(buildScreensConfigPath(workspaceRoot, id));
  if (!result.ok) {
    throw new ApiError("SCREENS_CONFIG_INVALID", 500, `projects/${id}/screens.config.yaml không hợp lệ`);
  }
  return result.data;
}

export function updateScreensConfig(workspaceRoot: string, projectId: string, input: unknown): ScreensConfig {
  const id = requireValidId(projectId);
  requireProject(workspaceRoot, id);

  const parsed = ScreensConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      "screens.config.yaml không hợp lệ",
      fieldErrorsFromZodIssues(parsed.error.issues),
    );
  }

  writeScreensConfig(workspaceRoot, id, parsed.data);
  return parsed.data;
}

export function getLocatorsFile(workspaceRoot: string, projectId: string, screenId: string): LocatorsFile {
  const id = requireValidId(projectId);
  const sId = requireValidId(screenId);
  requireProject(workspaceRoot, id);

  const path = buildLocatorsFilePath(workspaceRoot, id, sId);
  if (!existsSync(path)) {
    return { screen: sId, controls: [] };
  }

  const result = loadLocatorsFile(path);
  if (!result.ok) {
    throw new ApiError("LOCATORS_FILE_INVALID", 500, `${sId}.locators.yaml không hợp lệ`);
  }
  return result.data;
}

export function updateLocatorsFile(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  input: unknown,
): LocatorsFile {
  const id = requireValidId(projectId);
  const sId = requireValidId(screenId);
  requireProject(workspaceRoot, id);

  const parsed = LocatorsFileSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `${sId}.locators.yaml không hợp lệ`,
      fieldErrorsFromZodIssues(parsed.error.issues),
    );
  }

  writeLocatorsFile(workspaceRoot, id, sId, parsed.data);
  return parsed.data;
}

export function reviewRun(workspaceRoot: string, projectId: string, runId: string): HistoryEntry {
  const pId = requireValidId(projectId);
  const rId = requireValidId(runId);
  requireProject(workspaceRoot, pId);

  let updated: HistoryEntry[];
  try {
    updated = markRunReviewed(workspaceRoot, pId, rId);
  } catch {
    throw new ApiError("RUN_NOT_FOUND", 404, `Không tìm thấy run "${rId}" của project "${pId}"`);
  }

  const entry = updated.find((e) => e.runId === rId);
  if (!entry) {
    throw new ApiError("RUN_NOT_FOUND", 404, `Không tìm thấy run "${rId}" của project "${pId}"`);
  }
  return entry;
}
