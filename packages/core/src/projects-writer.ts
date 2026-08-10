import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import { ProjectsFileSchema, type ProjectsFile } from "./config.js";
import { buildProjectDir } from "./paths.js";

/** Ghi `workspace/projects.yaml` — catalog có thể sửa, ghi đè (khác artifact bất biến trong `storage-writer.ts`). */
export function writeProjectsFile(workspaceRoot: string, data: ProjectsFile): void {
  ProjectsFileSchema.parse(data);
  const path = join(workspaceRoot, "projects.yaml");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, yaml.dump(data));
}

const SCREENS_CONFIG_STUB = `baseUrl: "https://example.com"
locales:
  - vi
screens:
  - id: home
    url: /
    track: []
`;

/** Tạo `projects/<id>/screens.config.yaml` mẫu tối thiểu nếu chưa tồn tại — không ghi đè config đã có. */
export function ensureScreensConfigStub(workspaceRoot: string, projectId: string): void {
  const path = join(buildProjectDir(workspaceRoot, projectId), "screens.config.yaml");
  if (existsSync(path)) return;

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, SCREENS_CONFIG_STUB);
}
