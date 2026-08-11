import { useEffect, useState } from "react";
import type { ScreensConfig } from "core";
import { apiGet } from "./api-client.js";

export function useScreensConfig(projectId: string | undefined, refreshToken: number): ScreensConfig | null {
  const [config, setConfig] = useState<ScreensConfig | null>(null);

  useEffect(() => {
    if (!projectId) {
      setConfig(null);
      return;
    }
    apiGet<ScreensConfig>(`/api/projects/${projectId}/screens-config`)
      .then(setConfig)
      .catch(() => setConfig(null));
  }, [projectId, refreshToken]);

  return config;
}
