import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import yaml from "js-yaml";
import { LocatorsFileSchema, type LocatorsFile } from "./config.js";
import { buildLocatorsFilePath } from "./paths.js";

/** Ghi `projects/<id>/locators/<screen>.locators.yaml` — ghi đè toàn bộ, validate trước khi ghi. */
export function writeLocatorsFile(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  data: LocatorsFile,
): void {
  LocatorsFileSchema.parse(data);
  const path = buildLocatorsFilePath(workspaceRoot, projectId, screenId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.dump(data));
}
