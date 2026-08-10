import type { Report } from "core";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue(value: unknown): string {
  return escapeHtml(typeof value === "string" ? value : JSON.stringify(value));
}

function renderRows(report: Report): string {
  return report.screens
    .flatMap((screen) =>
      screen.changes.map(
        (change) => `
      <tr>
        <td>${escapeHtml(screen.screenId)}</td>
        <td>${escapeHtml(screen.locale)}</td>
        <td>${escapeHtml(change.changeType)}</td>
        <td>${escapeHtml(change.key)}</td>
        <td>${escapeHtml(change.severity)}</td>
        <td>${formatValue(change.before)}</td>
        <td>${formatValue(change.after)}</td>
      </tr>`,
      ),
    )
    .join("");
}

/** Render `report.json` thành 1 trang HTML tĩnh xem offline — bảng thay đổi + before/after. */
export function renderReportHtml(report: Report): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DEBQC report — ${escapeHtml(report.project)} — ${escapeHtml(report.runId)}</title>
</head>
<body>
  <h1>${escapeHtml(report.project)} — run ${escapeHtml(report.runId)}</h1>
  <p>${escapeHtml(report.startedAt)} → ${escapeHtml(report.finishedAt)}</p>
  <p>CRITICAL: ${report.severityCounts.CRITICAL} · MAJOR: ${report.severityCounts.MAJOR} · MINOR: ${report.severityCounts.MINOR} · INFO: ${report.severityCounts.INFO}</p>
  <table border="1" cellpadding="4">
    <thead>
      <tr><th>Screen</th><th>Locale</th><th>Change type</th><th>Key</th><th>Severity</th><th>Before</th><th>After</th></tr>
    </thead>
    <tbody>${renderRows(report)}
    </tbody>
  </table>
</body>
</html>
`;
}
