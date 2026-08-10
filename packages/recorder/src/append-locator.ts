import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import type { LocatorsFile, RegistryControl } from "core";
import { buildProjectDir, loadLocatorsFile, sanitizeIdSegment } from "core/node";

function locatorsPath(workspaceRoot: string, projectId: string, screenId: string): string {
  return join(buildProjectDir(workspaceRoot, projectId), "locators", `${sanitizeIdSegment(screenId)}.locators.yaml`);
}

/** Nối 1 control vào `<screen>.locators.yaml` (tạo file mới nếu chưa có) — chặn append trùng `key`. */
export function appendLocatorEntry(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  entry: RegistryControl,
): LocatorsFile {
  const path = locatorsPath(workspaceRoot, projectId, screenId);

  let file: LocatorsFile;
  if (existsSync(path)) {
    const result = loadLocatorsFile(path);
    if (!result.ok) {
      throw new Error(result.errors.map((e) => `${e.file}: ${e.field} — ${e.message}`).join("; "));
    }
    file = result.data;
  } else {
    file = { screen: screenId, controls: [] };
  }

  if (file.controls.some((c) => c.key === entry.key)) {
    throw new Error(`Control key "${entry.key}" đã tồn tại trong ${path}`);
  }

  const updated: LocatorsFile = { ...file, controls: [...file.controls, entry] };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.dump(updated));

  return updated;
}
