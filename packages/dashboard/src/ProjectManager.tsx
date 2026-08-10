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
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Quản lý project</h2>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {projects.map((project) => (
          <li key={project.id} className="flex items-center justify-between gap-3 px-3 py-2">
            {editingId === project.id ? (
              <>
                <label className="flex flex-1 items-center gap-2 text-sm text-slate-700">
                  Tên
                  <input
                    data-testid="project_edit_name_input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </label>
                <button
                  type="button"
                  data-testid="project_save_button"
                  onClick={handleSaveEdit}
                  className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  data-testid="project_cancel_edit_button"
                  onClick={() => setEditingId(null)}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Huỷ
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-slate-800">
                  {project.name} <span className="text-slate-400">({project.id})</span>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="project_edit_button"
                    onClick={() => startEdit(project)}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    data-testid="project_delete_button"
                    onClick={() => handleDelete(project.id)}
                    className="rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Xoá
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Id
          <input
            data-testid="project_id_input"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tên
          <input
            data-testid="project_name_input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <button
          type="submit"
          data-testid="project_create_button"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Thêm project
        </button>
      </form>
    </section>
  );
}
