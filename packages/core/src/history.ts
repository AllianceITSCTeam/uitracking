import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildProjectDir } from "./paths.js";

export type HistoryEntry = { runId: string; capturedAt: string; reviewedAt?: string };

function historyPath(workspaceRoot: string, projectId: string): string {
  return join(buildProjectDir(workspaceRoot, projectId), "history.json");
}

/** Nối 1 run vào `history.json` của project (dựng timeline) — chặn append trùng `runId`. */
export function appendHistoryEntry(
  workspaceRoot: string,
  projectId: string,
  entry: HistoryEntry,
): HistoryEntry[] {
  const path = historyPath(workspaceRoot, projectId);
  const existing: HistoryEntry[] = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf-8")) as HistoryEntry[])
    : [];

  if (existing.some((e) => e.runId === entry.runId)) {
    throw new Error(`History entry for runId "${entry.runId}" already exists`);
  }

  const updated = [...existing, entry];
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(updated));

  return updated;
}

export function markRunReviewed(
  workspaceRoot: string,
  projectId: string,
  runId: string,
): HistoryEntry[] {
  const path = historyPath(workspaceRoot, projectId);
  const existing: HistoryEntry[] = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf-8")) as HistoryEntry[])
    : [];

  if (!existing.some((e) => e.runId === runId)) {
    throw new Error(`History entry for runId "${runId}" not found`);
  }

  const reviewedAt = new Date().toISOString();
  const updated = existing.map((e) => (e.runId === runId ? { ...e, reviewedAt } : e));
  writeFileSync(path, JSON.stringify(updated));

  return updated;
}
