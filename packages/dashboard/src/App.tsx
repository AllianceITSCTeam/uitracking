import { useCallback, useState } from "react";
import type { HistoryEntry } from "core/node";
import { Nav } from "./Nav.js";
import { ConfigPage } from "./ConfigPage.js";
import { ReviewPage } from "./ReviewPage.js";
import { useQueryParams } from "./use-query-params.js";
import { useProjects } from "./use-projects.js";

export function App() {
  const [params, setQueryParams] = useQueryParams();
  const [runs, setRuns] = useState<HistoryEntry[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [projectsRefreshToken, setProjectsRefreshToken] = useState(0);
  const projects = useProjects(projectsRefreshToken);

  const page = params.page === "config" ? "config" : "review";
  const projectId = params.project;
  const runId = params.run;
  const currentRun = runs.find((r) => r.runId === runId);

  const handleRunsLoaded = useCallback((loaded: HistoryEntry[]) => {
    setRuns(loaded);
  }, []);

  const handleProjectsChanged = () => setProjectsRefreshToken((t) => t + 1);

  return (
    <main className="min-h-screen mx-auto max-w-6xl space-y-6 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-slate-900">DEBQC — Dashboard</h1>
      <Nav page={page} onNavigate={(next) => setQueryParams({ page: next })} />
      {page === "config" ? (
        <ConfigPage projects={projects} onChanged={handleProjectsChanged} />
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
          onChangeTypeFilter={(changeType) => setQueryParams({ changeType })}
          onLocaleFilter={(locale) => setQueryParams({ locale })}
        />
      )}
    </main>
  );
}
