import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { LOCATOR_STRATEGIES, TRACK_FIELDS, type LocatorsFile, type RegistryControl, type TrackField } from "core";
import { ApiClientError, apiPatch } from "./api-client.js";
import { LocatorsImportError, parseLocatorsImportFile } from "./parse-locators-import.js";

type Props = {
  projectId: string;
  screenId: string;
  file: LocatorsFile;
  onSaved: () => void;
};

function emptyControl(): RegistryControl {
  return { key: "", locator: { strategy: "getByTestId", value: "" } };
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Lỗi không xác định";
}

export function LocatorsEditor({ projectId, screenId, file, onSaved }: Props) {
  const [controls, setControls] = useState<RegistryControl[]>(file.controls);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const updateControl = (index: number, patch: Partial<RegistryControl>) => {
    setControls((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const updateLocatorValue = (index: number, patch: Partial<RegistryControl["locator"]>) => {
    setControls((prev) => prev.map((c, i) => (i === index ? { ...c, locator: { ...c.locator, ...patch } } : c)));
  };

  const updateOptionName = (index: number, name: string) => {
    setControls((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (!name) {
          const { options: _options, ...locator } = c.locator;
          return { ...c, locator };
        }
        return { ...c, locator: { ...c.locator, options: { name } } };
      }),
    );
  };

  const toggleTrack = (index: number, field: TrackField) => {
    setControls((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const track = c.track ?? [];
        const has = track.includes(field);
        return { ...c, track: has ? track.filter((f) => f !== field) : [...track, field] };
      }),
    );
  };

  const addControl = () => setControls((prev) => [...prev, emptyControl()]);
  const removeControl = (index: number) => setControls((prev) => prev.filter((_, i) => i !== index));

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const importedFile = event.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = "";
    if (!importedFile) return;
    setError(null);
    setImportInfo(null);
    try {
      const text = await importedFile.text();
      const imported = parseLocatorsImportFile(text);
      setControls(imported.controls);
      setImportInfo(
        imported.screen !== screenId
          ? `Đã import ${imported.controls.length} control (file khai cho screen "${imported.screen}", khác screen hiện tại "${screenId}"). Kiểm tra lại rồi bấm Lưu.`
          : `Đã import ${imported.controls.length} control từ file. Kiểm tra lại rồi bấm Lưu.`,
      );
    } catch (err) {
      setError(err instanceof LocatorsImportError ? err.message : "Không đọc được file");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload: LocatorsFile = { screen: screenId, controls };
      await apiPatch(`/api/projects/${projectId}/screens/${screenId}/locators`, payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Locator registry — {screenId}</h2>
        <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Import từ file
          <input
            ref={importInputRef}
            type="file"
            accept=".yaml,.yml"
            data-testid="locator_import_file_input"
            onChange={handleImportFile}
            className="hidden"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {importInfo && (
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{importInfo}</p>
      )}
      <ul className="space-y-2">
        {controls.map((control, index) => (
          <li key={index} className="space-y-2 rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Key
                <input
                  data-testid={`locator_key_input_${index}`}
                  value={control.key}
                  onChange={(e) => updateControl(index, { key: e.target.value })}
                  required
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Strategy
                <select
                  data-testid={`locator_strategy_select_${index}`}
                  value={control.locator.strategy}
                  onChange={(e) => updateLocatorValue(index, { strategy: e.target.value as typeof LOCATOR_STRATEGIES[number] })}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {LOCATOR_STRATEGIES.map((strategy) => (
                    <option key={strategy} value={strategy}>
                      {strategy}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Value
                <input
                  data-testid={`locator_value_input_${index}`}
                  value={control.locator.value}
                  onChange={(e) => updateLocatorValue(index, { value: e.target.value })}
                  required
                  className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              {control.locator.strategy === "getByRole" && (
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  name (options, optional)
                  <input
                    data-testid={`locator_option_name_input_${index}`}
                    value={typeof control.locator.options?.name === "string" ? control.locator.options.name : ""}
                    onChange={(e) => updateOptionName(index, e.target.value)}
                    className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
              )}
              <button
                type="button"
                data-testid={`locator_remove_button_${index}`}
                onClick={() => removeControl(index)}
                className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Xoá
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700">
              {TRACK_FIELDS.map((field) => (
                <label key={field} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    data-testid={`locator_track_${field}_checkbox_${index}`}
                    checked={(control.track ?? []).includes(field)}
                    onChange={() => toggleTrack(index, field)}
                  />
                  {field}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-testid="locator_add_button"
        onClick={addControl}
        className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Thêm control
      </button>
      <button
        type="submit"
        data-testid="locators_save_button"
        disabled={saving}
        className="block rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Lưu locators
      </button>
    </form>
  );
}
