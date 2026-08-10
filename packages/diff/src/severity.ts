import type { ChangeType, Severity } from "core";

const SEVERITY_BY_CHANGE_TYPE: Record<ChangeType, Severity> = {
  LOCATOR_BROKEN: "CRITICAL",
  CONTROL_REMOVED: "CRITICAL",
  TYPE_CHANGED: "MAJOR",
  OPTIONS_CHANGED: "MAJOR",
  TEXT_CHANGED: "MINOR",
  CONTROL_REORDERED: "MINOR",
  STYLE_CHANGED: "INFO",
  CONTROL_ADDED: "INFO",
  MISSING_TRANSLATION: "MAJOR",
  UNTRANSLATED: "MINOR",
  STRUCTURAL_DRIFT: "INFO",
};

export function changeSeverity(changeType: ChangeType): Severity {
  return SEVERITY_BY_CHANGE_TYPE[changeType];
}
