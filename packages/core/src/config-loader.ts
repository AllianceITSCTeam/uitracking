import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import type { ZodType } from "zod";
import { LocatorsFileSchema, ProjectsFileSchema, ScreensConfigSchema } from "./config.js";
import type { LocatorsFile, ProjectsFile, ScreensConfig } from "./config.js";

export type ConfigFieldError = {
  file: string;
  field: string;
  message: string;
};

export type ConfigLoadResult<T> = { ok: true; data: T } | { ok: false; errors: ConfigFieldError[] };

function readAndParse<T>(file: string, schema: ZodType<T>): ConfigLoadResult<T> {
  let raw: unknown;
  try {
    raw = yaml.load(readFileSync(file, "utf-8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [{ file, field: "<file>", message }] };
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      file,
      field: issue.path.length > 0 ? issue.path.join(".") : "<root>",
      message: issue.message,
    })),
  };
}

/** Đọc + validate `workspace/projects.yaml`. */
export function loadProjectsFile(file: string): ConfigLoadResult<ProjectsFile> {
  return readAndParse(file, ProjectsFileSchema);
}

/** Đọc + validate `projects/<id>/screens.config.yaml`. */
export function loadScreensConfig(file: string): ConfigLoadResult<ScreensConfig> {
  return readAndParse(file, ScreensConfigSchema);
}

/** Đọc + validate `projects/<id>/locators/<screen-id>.locators.yaml`. */
export function loadLocatorsFile(file: string): ConfigLoadResult<LocatorsFile> {
  return readAndParse(file, LocatorsFileSchema);
}
