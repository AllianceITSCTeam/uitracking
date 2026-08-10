import { SEVERITIES, type ChangeType, type Severity } from "./change-type.js";

export type Change = {
  changeType: ChangeType;
  key: string;
  before: unknown;
  after: unknown;
  severity: Severity;
};

export type RunReport = {
  runId: string;
  project: string;
  screenId: string;
  locale: string;
  changes: Change[];
};

export type SeverityCounts = Record<Severity, number>;

export type Report = {
  runId: string;
  project: string;
  startedAt: string;
  finishedAt: string;
  screens: RunReport[];
  severityCounts: SeverityCounts;
};

/** Gộp nhiều `RunReport` (nhiều screen/locale) của 1 run thành 1 `Report`, tally severity. */
export function buildReport(
  runId: string,
  project: string,
  startedAt: string,
  finishedAt: string,
  screens: RunReport[],
): Report {
  const severityCounts = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as SeverityCounts;
  for (const screen of screens) {
    for (const change of screen.changes) {
      severityCounts[change.severity] += 1;
    }
  }
  return { runId, project, startedAt, finishedAt, screens, severityCounts };
}
