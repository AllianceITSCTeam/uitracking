import type { HistoryEntry } from "core/node";
import { ProjectSelect } from "./ProjectSelect.js";
import { RunTimeline } from "./RunTimeline.js";
import { DiffViewer } from "./DiffViewer.js";
import { ReviewButton } from "./ReviewButton.js";
import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  projectId: string | undefined;
  runId: string | undefined;
  changeType: string | undefined;
  locale: string | undefined;
  reviewedAt: string | undefined;
  refreshToken: number;
  onProjectChange: (projectId: string) => void;
  onSelectRun: (runId: string) => void;
  onRunsLoaded: (runs: HistoryEntry[]) => void;
  onReviewed: () => void;
  onChangeTypeFilter: (changeType: string | undefined) => void;
  onLocaleFilter: (locale: string | undefined) => void;
};

export function ReviewPage({
  projects,
  projectId,
  runId,
  changeType,
  locale,
  reviewedAt,
  refreshToken,
  onProjectChange,
  onSelectRun,
  onRunsLoaded,
  onReviewed,
  onChangeTypeFilter,
  onLocaleFilter,
}: Props) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ProjectSelect projects={projects} projectId={projectId} onChange={onProjectChange} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <RunTimeline
          projectId={projectId}
          runId={runId}
          refreshToken={refreshToken}
          onSelectRun={onSelectRun}
          onRunsLoaded={onRunsLoaded}
        />
      </section>
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <ReviewButton projectId={projectId} runId={runId} reviewedAt={reviewedAt} onReviewed={onReviewed} />
        <DiffViewer
          projectId={projectId}
          runId={runId}
          changeType={changeType}
          locale={locale}
          onChangeTypeFilter={onChangeTypeFilter}
          onLocaleFilter={onLocaleFilter}
        />
      </section>
    </>
  );
}
