import { useState, type FormEvent } from "react";
import { ApiClientError, apiDelete, apiPatch, apiPost } from "./api-client.js";
import type { ProjectSummary } from "./api-handlers.js";

type Props = {
  projects: ProjectSummary[];
  onChanged: () => void;
};

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "Lỗi không xác định";
}

export function ProjectManager({ projects, onChanged }: Props) {
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiPost("/api/projects", { id: newId, name: newName });
      setNewId("");
      setNewName("");
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const startEdit = (project: ProjectSummary) => {
    setEditingId(project.id);
    setEditingName(project.name);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await apiPatch(`/api/projects/${editingId}`, { name: editingName });
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm(`Xoá project "${projectId}" khỏi danh sách?`)) return;
    setError(null);
    try {
      await apiDelete(`/api/projects/${projectId}`);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section>
      <h2>Quản lý project</h2>
      {error && <p role="alert">{error}</p>}
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {editingId === project.id ? (
              <>
                <label>
                  Tên
                  <input
                    data-testid="project_edit_name_input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                </label>
                <button type="button" data-testid="project_save_button" onClick={handleSaveEdit}>
                  Lưu
                </button>
                <button
                  type="button"
                  data-testid="project_cancel_edit_button"
                  onClick={() => setEditingId(null)}
                >
                  Huỷ
                </button>
              </>
            ) : (
              <>
                <span>
                  {project.name} ({project.id})
                </span>
                <button
                  type="button"
                  data-testid="project_edit_button"
                  onClick={() => startEdit(project)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  data-testid="project_delete_button"
                  onClick={() => handleDelete(project.id)}
                >
                  Xoá
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate}>
        <label>
          Id
          <input
            data-testid="project_id_input"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            required
          />
        </label>
        <label>
          Tên
          <input
            data-testid="project_name_input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
        </label>
        <button type="submit" data-testid="project_create_button">
          Thêm project
        </button>
      </form>
    </section>
  );
}
