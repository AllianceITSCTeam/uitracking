import { useState, type FormEvent } from "react";
import { TRACK_FIELDS, type AuthConfig, type ScreenConfig, type ScreensConfig, type TrackField } from "core";
import { ApiClientError, apiPatch } from "./api-client.js";
import { buildStep, stepAction, stepSelector, type AuthStep, type AuthStepAction } from "./auth-step-helpers.js";

type Props = {
  projectId: string;
  config: ScreensConfig;
  onSaved: () => void;
};

function toLocalesInput(locales: string[]): string {
  return locales.join(", ");
}

function fromLocalesInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function emptyScreen(): ScreenConfig {
  return { id: "", url: "", track: [] };
}

function emptyAuthStep(): AuthStep {
  return { fill: "", value: "" };
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Lỗi không xác định";
}

export function ScreensConfigEditor({ projectId, config, onSaved }: Props) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [localesInput, setLocalesInput] = useState(toLocalesInput(config.locales));
  const [screens, setScreens] = useState<ScreenConfig[]>(config.screens);
  const [authEnabled, setAuthEnabled] = useState(config.auth !== undefined);
  const [loginUrl, setLoginUrl] = useState(config.auth?.loginUrl ?? "");
  const [reuseSession, setReuseSession] = useState(config.auth?.reuseSession ?? false);
  const [steps, setSteps] = useState<AuthStep[]>(config.auth?.steps ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateScreen = (index: number, patch: Partial<ScreenConfig>) => {
    setScreens((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const toggleTrack = (index: number, field: TrackField) => {
    setScreens((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const has = s.track.includes(field);
        return { ...s, track: has ? s.track.filter((f) => f !== field) : [...s.track, field] };
      }),
    );
  };

  const addScreen = () => setScreens((prev) => [...prev, emptyScreen()]);
  const removeScreen = (index: number) => setScreens((prev) => prev.filter((_, i) => i !== index));

  const updateStepAction = (index: number, action: AuthStepAction) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? buildStep(action, stepSelector(s)) : s)));
  };

  const updateStepSelector = (index: number, selector: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? buildStep(stepAction(s), selector, "value" in s ? s.value : undefined) : s)),
    );
  };

  const updateStepValue = (index: number, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, value } : s)) as AuthStep[]);
  };

  const addStep = () => setSteps((prev) => [...prev, emptyAuthStep()]);
  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const auth: AuthConfig | undefined = authEnabled
        ? { type: "form", loginUrl, steps, ...(reuseSession ? { reuseSession } : {}) }
        : undefined;
      const payload: ScreensConfig = {
        baseUrl,
        locales: fromLocalesInput(localesInput),
        ...(auth ? { auth } : {}),
        screens,
      };
      await apiPatch(`/api/projects/${projectId}/screens-config`, payload);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">URL của project</h2>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Base URL
          <input
            data-testid="screens_config_base_url_input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
            className="w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Locales (phân cách bằng dấu phẩy)
          <input
            data-testid="screens_config_locales_input"
            value={localesInput}
            onChange={(e) => setLocalesInput(e.target.value)}
            required
            className="w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Đăng nhập</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            data-testid="auth_enabled_checkbox"
            checked={authEnabled}
            onChange={(e) => setAuthEnabled(e.target.checked)}
          />
          Screen yêu cầu đăng nhập trước khi capture
        </label>
        {authEnabled && (
          <div className="space-y-3 rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Login URL
                <input
                  data-testid="auth_login_url_input"
                  value={loginUrl}
                  onChange={(e) => setLoginUrl(e.target.value)}
                  required
                  className="w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  data-testid="auth_reuse_session_checkbox"
                  checked={reuseSession}
                  onChange={(e) => setReuseSession(e.target.checked)}
                />
                Giữ session (bỏ qua đăng nhập lại ở các lần chạy sau)
              </label>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Các bước đăng nhập</h4>
              <ul className="space-y-2">
                {steps.map((step, index) => {
                  const action = stepAction(step);
                  return (
                    <li key={index} className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Hành động
                        <select
                          data-testid={`auth_step_action_select_${index}`}
                          value={action}
                          onChange={(e) => updateStepAction(index, e.target.value as AuthStepAction)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="fill">fill</option>
                          <option value="click">click</option>
                          <option value="waitFor">waitFor</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Selector
                        <input
                          data-testid={`auth_step_selector_input_${index}`}
                          value={stepSelector(step)}
                          onChange={(e) => updateStepSelector(index, e.target.value)}
                          required
                          className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </label>
                      {action === "fill" && (
                        <label className="flex flex-col gap-1 text-sm text-slate-700">
                          Value
                          <input
                            data-testid={`auth_step_value_input_${index}`}
                            value={"value" in step ? step.value : ""}
                            onChange={(e) => updateStepValue(index, e.target.value)}
                            className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-500">
                            Dùng {"${TÊN_BIẾN_MÔI_TRƯỜNG}"} thay vì nhập mật khẩu thật
                          </span>
                        </label>
                      )}
                      <button
                        type="button"
                        data-testid={`auth_step_remove_button_${index}`}
                        onClick={() => removeStep(index)}
                        className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Xoá
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                data-testid="auth_step_add_button"
                onClick={addStep}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Thêm bước
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Screens</h3>
        <ul className="space-y-2">
          {screens.map((screen, index) => (
            <li key={index} className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Id
                  <input
                    data-testid={`screen_id_input_${index}`}
                    value={screen.id}
                    onChange={(e) => updateScreen(index, { id: e.target.value })}
                    required
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  URL
                  <input
                    data-testid={`screen_url_input_${index}`}
                    value={screen.url}
                    onChange={(e) => updateScreen(index, { url: e.target.value })}
                    required
                    className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  waitFor (optional)
                  <input
                    data-testid={`screen_wait_for_input_${index}`}
                    value={screen.waitFor ?? ""}
                    onChange={(e) => updateScreen(index, { waitFor: e.target.value || undefined })}
                    className="w-56 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <button
                  type="button"
                  data-testid={`screen_remove_button_${index}`}
                  onClick={() => removeScreen(index)}
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
                      data-testid={`screen_track_${field}_checkbox_${index}`}
                      checked={screen.track.includes(field)}
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
          data-testid="screen_add_button"
          onClick={addScreen}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Thêm screen
        </button>
      </div>

      <button
        type="submit"
        data-testid="screens_config_save_button"
        disabled={saving}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Lưu URL & screens
      </button>
    </form>
  );
}
