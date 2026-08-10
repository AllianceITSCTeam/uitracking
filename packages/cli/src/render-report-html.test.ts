import type { Report } from "core";
import { describe, expect, it } from "vitest";
import { renderReportHtml } from "./render-report-html.js";

const REPORT: Report = {
  runId: "run-1",
  project: "fixture-app",
  startedAt: "2026-08-10T00:00:00.000Z",
  finishedAt: "2026-08-10T00:00:05.000Z",
  screens: [
    {
      runId: "run-1",
      project: "fixture-app",
      screenId: "customer-edit",
      locale: "vi",
      changes: [
        {
          changeType: "TEXT_CHANGED",
          key: "field.email",
          before: "Email",
          after: "Địa chỉ email",
          severity: "MINOR",
        },
      ],
    },
  ],
  severityCounts: { CRITICAL: 0, MAJOR: 0, MINOR: 1, INFO: 0 },
};

describe("renderReportHtml", () => {
  it("includes run metadata, severity counts, and each change as a table row", () => {
    const html = renderReportHtml(REPORT);

    expect(html).toContain("fixture-app");
    expect(html).toContain("run-1");
    expect(html).toContain("MINOR: 1");
    expect(html).toContain("customer-edit");
    expect(html).toContain("field.email");
    expect(html).toContain("TEXT_CHANGED");
    expect(html).toContain("Địa chỉ email");
  });

  it("escapes HTML-significant characters in change values", () => {
    const report: Report = {
      ...REPORT,
      screens: [
        {
          runId: "run-1",
          project: "fixture-app",
          screenId: "customer-edit",
          locale: "vi",
          changes: [
            {
              changeType: "TEXT_CHANGED",
              key: "field.note",
              before: "<script>alert(1)</script>",
              after: "ok",
              severity: "MINOR",
            },
          ],
        },
      ],
    };

    const html = renderReportHtml(report);

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
