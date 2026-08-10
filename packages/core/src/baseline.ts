import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { buildBaselinePath } from "./paths.js";
import type { Screen } from "./snapshot.js";
import type { WriteResult } from "./storage-writer.js";

/** Đọc snapshot "mốc hiện hành" của 1 screen+locale — `null` nếu chưa có run nào trước đó. */
export function readBaseline(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  locale: string,
): Screen | null {
  const path = buildBaselinePath(workspaceRoot, projectId, screenId, locale);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Screen;
}

/** Ghi đè baseline bằng snapshot vừa capture — khác `writeArtifact` bất biến, baseline là mốc mutable. */
export function writeBaseline(
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  locale: string,
  screen: Screen,
): WriteResult {
  const path = buildBaselinePath(workspaceRoot, projectId, screenId, locale);
  const data = JSON.stringify(screen);

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);

  return {
    path,
    checksum: createHash("sha256").update(data).digest("hex"),
    size: Buffer.byteLength(data),
  };
}
