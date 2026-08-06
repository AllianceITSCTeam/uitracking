export const CHANGE_TYPES = [
  "TEXT_CHANGED",
  "OPTIONS_CHANGED",
  "CONTROL_ADDED",
  "CONTROL_REMOVED",
  "LOCATOR_BROKEN",
  "CONTROL_REORDERED",
  "TYPE_CHANGED",
  "STYLE_CHANGED",
  "MISSING_TRANSLATION",
  "UNTRANSLATED",
  "STRUCTURAL_DRIFT",
] as const;

export type ChangeType = (typeof CHANGE_TYPES)[number];

export const SEVERITIES = ["CRITICAL", "MAJOR", "MINOR", "INFO"] as const;

export type Severity = (typeof SEVERITIES)[number];
