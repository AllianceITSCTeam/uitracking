import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  projectId: string | undefined;
  onChange: (projectId: string) => void;
};

export function ProjectSelect({ projects, projectId, onChange }: Props) {
  return (
    <label>
      Project
      <select
        data-testid="project_select"
        value={projectId ?? ""}
        onChange={(e) => onChange(e.target.value)}
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
