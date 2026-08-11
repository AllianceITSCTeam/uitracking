import type { BrokenControl, Change, Control, IgnoreRule, RunReport, Screen } from "core";
import { maskValue } from "./apply-ignore-rules.js";
import { changeSeverity } from "./severity.js";

export type DiffInput = {
  runId: string;
  project: string;
  locale: string;
  /** Snapshot trước đó (baseline) — `null` nếu đây là lần capture đầu tiên. */
  previous: Screen | null;
  current: Screen;
  /** Registry controls không phân giải được ở lần capture hiện tại. */
  broken: BrokenControl[];
  ignore?: IgnoreRule[];
};

function maskOptions(options: string[] | null, ignore: IgnoreRule[] | undefined): string[] | null {
  return options ? options.map((option) => maskValue(option, ignore)) : null;
}

function arraysEqual<T>(a: T[] | null, b: T[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function styleEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((key) => a[key] === b[key]);
}

function diffMatchedControl(previous: Control, current: Control, ignore: IgnoreRule[] | undefined): Change[] {
  const changes: Change[] = [];
  const key = current.key;

  const prevLabel = maskValue(previous.text.label ?? "", ignore);
  const curLabel = maskValue(current.text.label ?? "", ignore);
  const prevPlaceholder = maskValue(previous.text.placeholder ?? "", ignore);
  const curPlaceholder = maskValue(current.text.placeholder ?? "", ignore);
  if (prevLabel !== curLabel || prevPlaceholder !== curPlaceholder) {
    changes.push({
      changeType: "TEXT_CHANGED",
      key,
      before: previous.text,
      after: current.text,
      severity: changeSeverity("TEXT_CHANGED"),
    });
  }

  if (!arraysEqual(maskOptions(previous.options, ignore), maskOptions(current.options, ignore))) {
    changes.push({
      changeType: "OPTIONS_CHANGED",
      key,
      before: previous.options,
      after: current.options,
      severity: changeSeverity("OPTIONS_CHANGED"),
    });
  }

  if (previous.type !== current.type) {
    changes.push({
      changeType: "TYPE_CHANGED",
      key,
      before: previous.type,
      after: current.type,
      severity: changeSeverity("TYPE_CHANGED"),
    });
  }

  if (previous.order !== current.order) {
    changes.push({
      changeType: "CONTROL_REORDERED",
      key,
      before: previous.order,
      after: current.order,
      severity: changeSeverity("CONTROL_REORDERED"),
    });
  }

  if (!styleEqual(previous.style, current.style)) {
    changes.push({
      changeType: "STYLE_CHANGED",
      key,
      before: previous.style,
      after: current.style,
      severity: changeSeverity("STYLE_CHANGED"),
    });
  }

  return changes;
}

/** So khớp theo `key` giữa 2 snapshot cùng locale — xem UI-TRACKING-TOOL-PLAN.md §3.3. */
export function diffScreens(input: DiffInput): RunReport {
  const { runId, project, locale, previous, current, broken, ignore } = input;

  const previousByKey = new Map((previous?.controls ?? []).map((control) => [control.key, control]));
  const brokenKeys = new Set(broken.map((entry) => entry.key));

  const changes: Change[] = [];

  for (const control of current.controls) {
    const previousControl = previousByKey.get(control.key);
    if (!previousControl) {
      changes.push({
        changeType: "CONTROL_ADDED",
        key: control.key,
        before: null,
        after: control,
        severity: changeSeverity("CONTROL_ADDED"),
      });
      continue;
    }
    changes.push(...diffMatchedControl(previousControl, control, ignore));
  }

  const currentKeys = new Set(current.controls.map((control) => control.key));
  for (const [key, previousControl] of previousByKey) {
    if (!currentKeys.has(key) && !brokenKeys.has(key)) {
      changes.push({
        changeType: "CONTROL_REMOVED",
        key,
        before: previousControl,
        after: null,
        severity: changeSeverity("CONTROL_REMOVED"),
      });
    }
  }

  for (const entry of broken) {
    changes.push({
      changeType: "LOCATOR_BROKEN",
      key: entry.key,
      before: previousByKey.get(entry.key) ?? null,
      after: null,
      severity: changeSeverity("LOCATOR_BROKEN"),
    });
  }

  const controls = current.controls.map((control) => ({
    key: control.key,
    before: previousByKey.get(control.key) ?? null,
    after: control,
  }));

  return { runId, project, screenId: current.id, locale, changes, controls };
}
