import type { Change, IgnoreRule, RunReport, Screen } from "core";
import { maskValue } from "./apply-ignore-rules.js";
import { changeSeverity } from "./severity.js";

export type LocaleDiffInput = {
  runId: string;
  project: string;
  baseLocale: string;
  /** Snapshot của cùng 1 screen ở từng locale, capture trong cùng 1 run. */
  screensByLocale: Map<string, Screen>;
  ignore?: IgnoreRule[];
};

function controlText(control: Screen["controls"][number]): string {
  return control.text.label ?? control.text.placeholder ?? "";
}

/** So control cùng `key` giữa locale gốc và các locale khác trong cùng run — phát hiện thiếu dịch. */
export function diffLocales(input: LocaleDiffInput): RunReport[] {
  const { runId, project, baseLocale, screensByLocale, ignore } = input;
  const baseScreen = screensByLocale.get(baseLocale);
  if (!baseScreen) return [];

  const baseByKey = new Map(baseScreen.controls.map((control) => [control.key, control]));
  const reports: RunReport[] = [];

  for (const [locale, screen] of screensByLocale) {
    if (locale === baseLocale) continue;

    const changes: Change[] = [];
    for (const control of screen.controls) {
      const baseControl = baseByKey.get(control.key);
      if (!baseControl) continue;

      const baseText = maskValue(controlText(baseControl), ignore);
      const curText = maskValue(controlText(control), ignore);
      if (baseText === "") continue;

      if (curText === "") {
        changes.push({
          changeType: "MISSING_TRANSLATION",
          key: control.key,
          before: baseText,
          after: curText,
          severity: changeSeverity("MISSING_TRANSLATION"),
        });
      } else if (curText === baseText) {
        changes.push({
          changeType: "UNTRANSLATED",
          key: control.key,
          before: baseText,
          after: curText,
          severity: changeSeverity("UNTRANSLATED"),
        });
      }
    }

    reports.push({ runId, project, screenId: screen.id, locale, changes });
  }

  return reports;
}
