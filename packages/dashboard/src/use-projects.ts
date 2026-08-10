import { useEffect, useState } from "react";
import { apiGet } from "./api-client.js";
import type { ProjectSummary } from "./api-handlers.js";

export function useProjects(refreshToken: number): ProjectSummary[] {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    apiGet<ProjectSummary[]>("/api/projects").then(setProjects).catch(() => setProjects([]));
  }, [refreshToken]);

  return projects;
}
