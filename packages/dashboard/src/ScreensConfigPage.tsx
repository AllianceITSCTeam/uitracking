import { useState } from "react";
import { ProjectSelect } from "./ProjectSelect.js";
import { ScreensConfigEditor } from "./ScreensConfigEditor.js";
import { LocatorsEditor } from "./LocatorsEditor.js";
import { useScreensConfig } from "./use-screens-config.js";
import { useLocatorsFile } from "./use-locators.js";
import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  projectId: string | undefined;
  onProjectChange: (projectId: string) => void;
};

export function ScreensConfigPage({ projects, projectId, onProjectChange }: Props) {
  const [screensRefreshToken, setScreensRefreshToken] = useState(0);
  const [locatorsRefreshToken, setLocatorsRefreshToken] = useState(0);
  const [selectedScreenId, setSelectedScreenId] = useState<string | undefined>(undefined);

  const config = useScreensConfig(projectId, screensRefreshToken);
  const activeScreenId = selectedScreenId ?? config?.screens[0]?.id;
  const locatorsFile = useLocatorsFile(projectId, activeScreenId, locatorsRefreshToken);

  return (
    <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <ProjectSelect projects={projects} projectId={projectId} onChange={onProjectChange} />

      {!projectId && <p className="text-sm text-slate-500">Chọn một project để khai báo URL & locator.</p>}

      {projectId && config && (
        <ScreensConfigEditor
          key={projectId}
          projectId={projectId}
          config={config}
          onSaved={() => setScreensRefreshToken((t) => t + 1)}
        />
      )}

      {projectId && config && config.screens.length > 0 && (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Screen
            <select
              data-testid="locators_screen_select"
              value={activeScreenId ?? ""}
              onChange={(e) => setSelectedScreenId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {config.screens.map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.id}
                </option>
              ))}
            </select>
          </label>

          {activeScreenId && locatorsFile && (
            <LocatorsEditor
              key={`${projectId}:${activeScreenId}`}
              projectId={projectId}
              screenId={activeScreenId}
              file={locatorsFile}
              onSaved={() => setLocatorsRefreshToken((t) => t + 1)}
            />
          )}
        </div>
      )}
    </section>
  );
}
