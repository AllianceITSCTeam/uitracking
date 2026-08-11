import type { BrokenControl, Control, Screen } from "core";
import { describe, expect, it } from "vitest";
import { diffScreens } from "./diff-screens.js";

function makeControl(overrides: Partial<Control> = {}): Control {
  return {
    key: "field.email",
    role: "textbox",
    tag: "input",
    type: "email",
    order: 0,
    text: { label: "Email", placeholder: undefined },
    options: null,
    style: { display: "block" },
    attrs: {},
    ...overrides,
  };
}

function makeScreen(controls: Control[]): Screen {
  return { id: "customer-edit", locale: "vi", capturedAt: "2026-08-10T00:00:00.000Z", controls };
}

describe("diffScreens", () => {
  it("emits CONTROL_ADDED for every control when there is no previous snapshot", () => {
    const emailControl = makeControl({ key: "field.email" });
    const statusControl = makeControl({ key: "field.status" });
    const current = makeScreen([emailControl, statusControl]);

    const report = diffScreens({
      runId: "run-1",
      project: "fixture-app",
      locale: "vi",
      previous: null,
      current,
      broken: [],
    });

    expect(report.screenId).toBe("customer-edit");
    expect(report.changes).toEqual([
      { changeType: "CONTROL_ADDED", key: "field.email", before: null, after: emailControl, severity: "INFO" },
      { changeType: "CONTROL_ADDED", key: "field.status", before: null, after: statusControl, severity: "INFO" },
    ]);
  });

  it("emits TEXT_CHANGED when label or placeholder differs", () => {
    const previousText = { label: "Email", placeholder: undefined };
    const currentText = { label: "Địa chỉ email", placeholder: undefined };
    const previous = makeScreen([makeControl({ text: previousText })]);
    const current = makeScreen([makeControl({ text: currentText })]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      {
        changeType: "TEXT_CHANGED",
        key: "field.email",
        before: previousText,
        after: currentText,
        severity: "MINOR",
      },
    ]);
  });

  it("emits OPTIONS_CHANGED when the option list differs", () => {
    const previous = makeScreen([makeControl({ options: ["active", "inactive"] })]);
    const current = makeScreen([makeControl({ options: ["active", "inactive", "pending"] })]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      {
        changeType: "OPTIONS_CHANGED",
        key: "field.email",
        before: ["active", "inactive"],
        after: ["active", "inactive", "pending"],
        severity: "MAJOR",
      },
    ]);
  });

  it("emits TYPE_CHANGED when the control type differs", () => {
    const previous = makeScreen([makeControl({ type: "text" })]);
    const current = makeScreen([makeControl({ type: "email" })]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      { changeType: "TYPE_CHANGED", key: "field.email", before: "text", after: "email", severity: "MAJOR" },
    ]);
  });

  it("emits CONTROL_REORDERED when order differs", () => {
    const previous = makeScreen([makeControl({ order: 0 })]);
    const current = makeScreen([makeControl({ order: 2 })]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      { changeType: "CONTROL_REORDERED", key: "field.email", before: 0, after: 2, severity: "MINOR" },
    ]);
  });

  it("emits STYLE_CHANGED when style properties differ", () => {
    const previous = makeScreen([makeControl({ style: { display: "block" } })]);
    const current = makeScreen([makeControl({ style: { display: "none" } })]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      {
        changeType: "STYLE_CHANGED",
        key: "field.email",
        before: { display: "block" },
        after: { display: "none" },
        severity: "INFO",
      },
    ]);
  });

  it("emits CONTROL_REMOVED when a previous control is gone and not reported as broken", () => {
    const emailControl = makeControl({ key: "field.email" });
    const previous = makeScreen([emailControl]);
    const current = makeScreen([]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([
      { changeType: "CONTROL_REMOVED", key: "field.email", before: emailControl, after: null, severity: "CRITICAL" },
    ]);
  });

  it("emits LOCATOR_BROKEN for entries in broken[] instead of CONTROL_REMOVED", () => {
    const ghostControl = makeControl({ key: "field.ghost" });
    const previous = makeScreen([ghostControl]);
    const current = makeScreen([]);
    const broken: BrokenControl[] = [{ key: "field.ghost", reason: "NOT_FOUND", count: 0 }];

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken });

    expect(report.changes).toEqual([
      {
        changeType: "LOCATOR_BROKEN",
        key: "field.ghost",
        before: ghostControl,
        after: null,
        severity: "CRITICAL",
      },
    ]);
  });

  it("masks dynamic text so a maskPattern-matched difference is not reported", () => {
    const previous = makeScreen([makeControl({ text: { label: "Cập nhật lúc 10:00", placeholder: undefined } })]);
    const current = makeScreen([makeControl({ text: { label: "Cập nhật lúc 10:05", placeholder: undefined } })]);

    const report = diffScreens({
      runId: "run-1",
      project: "fixture-app",
      locale: "vi",
      previous,
      current,
      broken: [],
      ignore: [{ maskPattern: "\\d{2}:\\d{2}" }],
    });

    expect(report.changes).toEqual([]);
  });

  it("emits no changes when current matches previous exactly", () => {
    const control = makeControl();
    const previous = makeScreen([control]);
    const current = makeScreen([makeControl()]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([]);
  });

  it("emits every applicable change type together when a control changes on multiple axes at once", () => {
    const previous = makeScreen([
      makeControl({ text: { label: "Email", placeholder: undefined }, type: "text", order: 0 }),
    ]);
    const current = makeScreen([
      makeControl({ text: { label: "Địa chỉ email", placeholder: undefined }, type: "email", order: 1 }),
    ]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes.map((change) => change.changeType)).toEqual([
      "TEXT_CHANGED",
      "TYPE_CHANGED",
      "CONTROL_REORDERED",
    ]);
  });

  it("masks dynamic options so a maskPattern-matched difference is not reported", () => {
    const previous = makeScreen([makeControl({ options: ["id-1"] })]);
    const current = makeScreen([makeControl({ options: ["id-2"] })]);

    const report = diffScreens({
      runId: "run-1",
      project: "fixture-app",
      locale: "vi",
      previous,
      current,
      broken: [],
      ignore: [{ maskPattern: "id-\\d+" }],
    });

    expect(report.changes).toEqual([]);
  });

  it("includes an unchanged control in controls with before/after both set, even though changes is empty", () => {
    const previousControl = makeControl();
    const currentControl = makeControl();
    const previous = makeScreen([previousControl]);
    const current = makeScreen([currentControl]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.changes).toEqual([]);
    expect(report.controls).toEqual([{ key: "field.email", before: previousControl, after: currentControl }]);
  });

  it("sets before to null in controls for a control with no previous snapshot", () => {
    const currentControl = makeControl();
    const current = makeScreen([currentControl]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous: null, current, broken: [] });

    expect(report.controls).toEqual([{ key: "field.email", before: null, after: currentControl }]);
  });

  it("omits a removed control from controls (only current.controls are represented)", () => {
    const previous = makeScreen([makeControl({ key: "field.email" })]);
    const current = makeScreen([]);

    const report = diffScreens({ runId: "run-1", project: "fixture-app", locale: "vi", previous, current, broken: [] });

    expect(report.controls).toEqual([]);
  });
});
