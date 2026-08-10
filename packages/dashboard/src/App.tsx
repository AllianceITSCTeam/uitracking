import { useCallback, useState } from "react";
import type { HistoryEntry } from "core/node";
import { ProjectSelect } from "./ProjectSelect.js";
import { ProjectManager } from "./ProjectManager.js";
import { RunTimeline } from "./RunTimeline.js";
import { DiffViewer } from "./DiffViewer.js";
import { ReviewButton } from "./ReviewButton.js";
import { useQueryParams } from "./use-query-params.js";
import { useProjects } from "./use-projects.js";

export function App() {
  const [params, setQueryParams] = useQueryParams();
  const [runs, setRuns] = useState<HistoryEntry[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [projectsRefreshToken, setProjectsRefreshToken] = useState(0);
  const projects = useProjects(projectsRefreshToken);

  const projectId = params.project;
  const runId = params.run;
  const currentRun = runs.find((r) => r.runId === runId);

  const handleRunsLoaded = useCallback((loaded: HistoryEntry[]) => {
    setRuns(loaded);
  }, []);

  return (
    <main>
      <h1>DEBQC — Dashboard</h1>
      <section>
        <ProjectSelect
          projects={projects}
          projectId={projectId}
          onChange={(id) => setQueryParams({ project: id, run: undefined })}
        />
      </section>
      <section>
        <ProjectManager projects={projects} onChanged={() => setProjectsRefreshToken((t) => t + 1)} />
      </section>
      <section>
        <RunTimeline
          projectId={projectId}
          runId={runId}
          refreshToken={refreshToken}
          onSelectRun={(id) => setQueryParams({ run: id })}
          onRunsLoaded={handleRunsLoaded}
        />
      </section>
      <section>
        <ReviewButton
          projectId={projectId}
          runId={runId}
          reviewedAt={currentRun?.reviewedAt}
          onReviewed={() => setRefreshToken((t) => t + 1)}
        />
        <DiffViewer
          projectId={projectId}
          runId={runId}
          changeType={params.changeType}
          locale={params.locale}
          onChangeTypeFilter={(changeType) => setQueryParams({ changeType })}
          onLocaleFilter={(locale) => setQueryParams({ locale })}
        />
      </section>
    </main>
  );
}
