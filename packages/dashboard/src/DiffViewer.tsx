import { useEffect, useState } from "react";
import { apiGet } from "./api-client.js";
import type { Change, Report } from "core";

type Props = {
  projectId: string | undefined;
  runId: string | undefined;
  changeType: string | undefined;
  locale: string | undefined;
  onChangeTypeFilter: (changeType: string | undefined) => void;
  onLocaleFilter: (locale: string | undefined) => void;
};

function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function DiffViewer({
  projectId,
  runId,
  changeType,
  locale,
  onChangeTypeFilter,
  onLocaleFilter,
}: Props) {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (!projectId || !runId) {
      setReport(null);
      return;
    }
    apiGet<Report>(`/api/projects/${projectId}/runs/${runId}/report`)
      .then(setReport)
      .catch(() => setReport(null));
  }, [projectId, runId]);

  if (!report) return null;

  const changeTypes = [...new Set(report.screens.flatMap((s) => s.changes.map((c) => c.changeType)))];
  const locales = [...new Set(report.screens.map((s) => s.locale))];

  const rows: { screenId: string; locale: string; change: Change }[] = report.screens
    .filter((s) => !locale || s.locale === locale)
    .flatMap((s) =>
      s.changes
        .filter((c) => !changeType || c.changeType === changeType)
        .map((change) => ({ screenId: s.screenId, locale: s.locale, change })),
    );

  return (
    <section>
      <div>
        <label>
          Loại thay đổi
          <select
            data-testid="change_type_filter"
            value={changeType ?? ""}
            onChange={(e) => onChangeTypeFilter(e.target.value || undefined)}
          >
            <option value="">Tất cả</option>
            {changeTypes.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </label>
        <label>
          Locale
          <select
            data-testid="locale_filter"
            value={locale ?? ""}
            onChange={(e) => onLocaleFilter(e.target.value || undefined)}
          >
            <option value="">Tất cả</option>
            {locales.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <table>
        <thead>
          <tr>
            <th>Screen</th>
            <th>Locale</th>
            <th>Key</th>
            <th>Loại</th>
            <th>Mức độ</th>
            <th>Trước</th>
            <th>Sau</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              <td>{row.screenId}</td>
              <td>{row.locale}</td>
              <td>{row.change.key}</td>
              <td>{row.change.changeType}</td>
              <td>{row.change.severity}</td>
              <td>{formatValue(row.change.before)}</td>
              <td>{formatValue(row.change.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
