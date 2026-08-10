import type { Control, Screen } from "core";
import { describe, expect, it } from "vitest";
import { diffLocales } from "./diff-locales.js";

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

function makeScreen(locale: string, controls: Control[]): Screen {
  return { id: "customer-edit", locale, capturedAt: "2026-08-10T00:00:00.000Z", controls };
}

describe("diffLocales", () => {
  it("emits MISSING_TRANSLATION when a control has text in the base locale but is empty elsewhere", () => {
    const screensByLocale = new Map([
      ["vi", makeScreen("vi", [makeControl({ text: { label: "Email", placeholder: undefined } })])],
      ["en", makeScreen("en", [makeControl({ text: { label: "", placeholder: undefined } })])],
    ]);

    const reports = diffLocales({ runId: "run-1", project: "fixture-app", baseLocale: "vi", screensByLocale });

    expect(reports).toEqual([
      {
        runId: "run-1",
        project: "fixture-app",
        screenId: "customer-edit",
        locale: "en",
        changes: [
          {
            changeType: "MISSING_TRANSLATION",
            key: "field.email",
            before: "Email",
            after: "",
            severity: "MAJOR",
          },
        ],
      },
    ]);
  });

  it("emits UNTRANSLATED when the text is identical to the base locale", () => {
    const screensByLocale = new Map([
      ["vi", makeScreen("vi", [makeControl({ text: { label: "Email", placeholder: undefined } })])],
      ["en", makeScreen("en", [makeControl({ text: { label: "Email", placeholder: undefined } })])],
    ]);

    const reports = diffLocales({ runId: "run-1", project: "fixture-app", baseLocale: "vi", screensByLocale });

    expect(reports[0]?.changes).toEqual([
      { changeType: "UNTRANSLATED", key: "field.email", before: "Email", after: "Email", severity: "MINOR" },
    ]);
  });

  it("emits nothing when the control is properly translated", () => {
    const screensByLocale = new Map([
      ["vi", makeScreen("vi", [makeControl({ text: { label: "Email", placeholder: undefined } })])],
      ["en", makeScreen("en", [makeControl({ text: { label: "Email address", placeholder: undefined } })])],
    ]);

    const reports = diffLocales({ runId: "run-1", project: "fixture-app", baseLocale: "vi", screensByLocale });

    expect(reports[0]?.changes).toEqual([]);
  });

  it("masks dynamic text so a maskPattern-matched difference is not reported as UNTRANSLATED", () => {
    const screensByLocale = new Map([
      ["vi", makeScreen("vi", [makeControl({ text: { label: "Cập nhật lúc 10:00", placeholder: undefined } })])],
      ["en", makeScreen("en", [makeControl({ text: { label: "Updated at 10:05", placeholder: undefined } })])],
    ]);

    const reports = diffLocales({
      runId: "run-1",
      project: "fixture-app",
      baseLocale: "vi",
      screensByLocale,
      ignore: [{ maskPattern: "\\d{2}:\\d{2}" }],
    });

    expect(reports[0]?.changes).toEqual([]);
  });

  it("ignores a control that only exists in one locale", () => {
    const screensByLocale = new Map([
      ["vi", makeScreen("vi", [makeControl({ key: "field.email" })])],
      ["en", makeScreen("en", [makeControl({ key: "field.status" })])],
    ]);

    const reports = diffLocales({ runId: "run-1", project: "fixture-app", baseLocale: "vi", screensByLocale });

    expect(reports[0]?.changes).toEqual([]);
  });
});
