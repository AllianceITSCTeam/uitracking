import type { ChangeType, Severity } from "./change-type.js";

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
  locale: string;
  changes: Change[];
};
