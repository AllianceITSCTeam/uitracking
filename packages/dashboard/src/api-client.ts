export class ApiClientError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;

  constructor(code: string, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = (await res.json()) as Envelope<T>;

  if (body.error) {
    throw new ApiClientError(body.error.code, body.error.message, body.error.fieldErrors);
  }

  return body.data as T;
}

function jsonInit(method: string, body?: unknown): RequestInit {
  if (body === undefined) return { method };
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, jsonInit("POST", body));
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, jsonInit("PATCH", body));
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
