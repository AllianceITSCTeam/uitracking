import { useCallback, useSyncExternalStore } from "react";

export function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  return Object.fromEntries(params.entries());
}

export function buildQuery(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSnapshot(): string {
  return window.location.search;
}

export function useQueryParams(): [
  Record<string, string>,
  (patch: Record<string, string | undefined>) => void,
] {
  const search = useSyncExternalStore(subscribe, getSnapshot);
  const params = parseQuery(search);

  const setQueryParams = useCallback((patch: Record<string, string | undefined>) => {
    const current = parseQuery(window.location.search);
    const next = buildQuery({ ...current, ...patch });
    window.history.pushState(null, "", next.length > 0 ? next : window.location.pathname);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return [params, setQueryParams];
}
