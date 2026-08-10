import { ProjectManager } from "./ProjectManager.js";
import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  onChanged: () => void;
};

export function ConfigPage({ projects, onChanged }: Props) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <ProjectManager projects={projects} onChanged={onChanged} />
    </section>
  );
}
