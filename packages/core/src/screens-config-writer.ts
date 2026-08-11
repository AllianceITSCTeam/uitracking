import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import yaml from "js-yaml";
import { ScreensConfigSchema, type ScreensConfig } from "./config.js";
import { buildScreensConfigPath } from "./paths.js";

/** Ghi `projects/<id>/screens.config.yaml` — ghi đè toàn bộ, validate trước khi ghi. */
export function writeScreensConfig(workspaceRoot: string, projectId: string, data: ScreensConfig): void {
  ScreensConfigSchema.parse(data);
  const path = buildScreensConfigPath(workspaceRoot, projectId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.dump(data));
}
