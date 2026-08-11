import { useEffect, useState } from "react";
import { apiGet } from "./api-client.js";
import type { Change, ControlSnapshotRow, Report } from "core";

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

  const controlRows: { screenId: string; locale: string; control: ControlSnapshotRow }[] = report.screens
    .filter((s) => !locale || s.locale === locale)
    .flatMap((s) => s.controls.map((control) => ({ screenId: s.screenId, locale: s.locale, control })));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Loại thay đổi
          <select
            data-testid="change_type_filter"
            value={changeType ?? ""}
            onChange={(e) => onChangeTypeFilter(e.target.value || undefined)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Tất cả</option>
            {changeTypes.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          Locale
          <select
            data-testid="locale_filter"
            value={locale ?? ""}
            onChange={(e) => onLocaleFilter(e.target.value || undefined)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Screen</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Locale</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Key</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Loại</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Mức độ</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Trước</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Sau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">{row.screenId}</td>
                <td className="px-3 py-2 text-slate-800">{row.locale}</td>
                <td className="px-3 py-2 text-slate-800">{row.change.key}</td>
                <td className="px-3 py-2 text-slate-800">{row.change.changeType}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                      (row.change.severity === "CRITICAL"
                        ? "bg-red-100 text-red-700"
                        : row.change.severity === "MAJOR"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600")
                    }
                  >
                    {row.change.severity}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{formatValue(row.change.before)}</td>
                <td className="px-3 py-2 text-slate-500">{formatValue(row.change.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold text-slate-700">Toàn bộ control (Trước/Sau)</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Screen</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Locale</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Key</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Trước</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Sau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {controlRows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-800">{row.screenId}</td>
                <td className="px-3 py-2 text-slate-800">{row.locale}</td>
                <td className="px-3 py-2 text-slate-800">{row.control.key}</td>
                <td className="px-3 py-2 text-slate-500">{formatValue(row.control.before)}</td>
                <td className="px-3 py-2 text-slate-500">{formatValue(row.control.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
