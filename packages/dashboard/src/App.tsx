import { useCallback, useState } from "react";
import type { HistoryEntry } from "core/node";
import { Sidebar } from "./Sidebar.js";
import { ConfigPage } from "./ConfigPage.js";
import { ScreensConfigPage } from "./ScreensConfigPage.js";
import { ReviewPage } from "./ReviewPage.js";
import { useQueryParams } from "./use-query-params.js";
import { useProjects } from "./use-projects.js";

export function App() {
  const [params, setQueryParams] = useQueryParams();
  const [runs, setRuns] = useState<HistoryEntry[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [projectsRefreshToken, setProjectsRefreshToken] = useState(0);
  const projects = useProjects(projectsRefreshToken);

  const page =
    params.page === "config" ? "config" : params.page === "screens-config" ? "screens-config" : "review";
  const projectId = params.project;
  const runId = params.run;
  const currentRun = runs.find((r) => r.runId === runId);

  const handleRunsLoaded = useCallback((loaded: HistoryEntry[]) => {
    setRuns(loaded);
  }, []);

  const handleProjectsChanged = () => setProjectsRefreshToken((t) => t + 1);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar page={page} onNavigate={(next) => setQueryParams({ page: next })} />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <h1 className="text-2xl font-semibold text-slate-900">DEBQC — Dashboard</h1>
          {page === "config" ? (
            <ConfigPage projects={projects} onChanged={handleProjectsChanged} />
          ) : page === "screens-config" ? (
            <ScreensConfigPage
              projects={projects}
              projectId={projectId}
              onProjectChange={(id) => setQueryParams({ project: id })}
            />
          ) : (
            <ReviewPage
              projects={projects}
              projectId={projectId}
              runId={runId}
              changeType={params.changeType}
              locale={params.locale}
              reviewedAt={currentRun?.reviewedAt}
              refreshToken={refreshToken}
              onProjectChange={(id) => setQueryParams({ project: id, run: undefined })}
              onSelectRun={(id) => setQueryParams({ run: id })}
              onRunsLoaded={handleRunsLoaded}
              onReviewed={() => setRefreshToken((t) => t + 1)}
              onRunTriggered={(newRunId) => {
                setRefreshToken((t) => t + 1);
                if (newRunId) setQueryParams({ run: newRunId });
              }}
              onChangeTypeFilter={(changeType) => setQueryParams({ changeType })}
              onLocaleFilter={(locale) => setQueryParams({ locale })}
            />
          )}
        </div>
      </main>
    </div>
  );
}
