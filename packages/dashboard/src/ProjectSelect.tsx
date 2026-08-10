import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  projectId: string | undefined;
  onChange: (projectId: string) => void;
};

export function ProjectSelect({ projects, projectId, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      Project
      <select
        data-testid="project_select"
        value={projectId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="" disabled>
          -- Chọn project --
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
