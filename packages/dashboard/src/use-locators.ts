import { useEffect, useState } from "react";
import type { LocatorsFile } from "core";
import { apiGet } from "./api-client.js";

export function useLocatorsFile(
  projectId: string | undefined,
  screenId: string | undefined,
  refreshToken: number,
): LocatorsFile | null {
  const [file, setFile] = useState<LocatorsFile | null>(null);

  useEffect(() => {
    if (!projectId || !screenId) {
      setFile(null);
      return;
    }
    apiGet<LocatorsFile>(`/api/projects/${projectId}/screens/${screenId}/locators`)
      .then(setFile)
      .catch(() => setFile(null));
  }, [projectId, screenId, refreshToken]);

  return file;
}
