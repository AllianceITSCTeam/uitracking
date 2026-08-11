import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import {
  ApiError,
  createProject,
  deleteProject,
  getLocatorsFile,
  getReport,
  getRunJob,
  getScreensConfig,
  listProjects,
  listRuns,
  parseTsLocatorImport,
  reviewRun,
  triggerRun,
  updateLocatorsFile,
  updateProject,
  updateScreensConfig,
} from "./src/api-handlers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = join(__dirname, "..", "..", "workspace");

type Envelope = {
  data: unknown;
  error: { code: string; message: string; fieldErrors?: Record<string, string[]> } | null;
  meta: { generatedAt: string };
};

function sendJson(res: ServerResponse, status: number, body: Envelope): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function envelopeOk(data: unknown): Envelope {
  return { data, error: null, meta: { generatedAt: new Date().toISOString() } };
}

function envelopeError(error: ApiError): Envelope {
  return {
    data: null,
    error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
    meta: { generatedAt: new Date().toISOString() },
  };
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (raw.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ApiError("INVALID_JSON", 400, "Body không phải JSON hợp lệ"));
      }
    });
    req.on("error", reject);
  });
}

async function handle(res: ServerResponse, run: () => unknown): Promise<void> {
  try {
    const data = await run();
    sendJson(res, 200, envelopeOk(data));
  } catch (error) {
    if (error instanceof ApiError) {
      sendJson(res, error.status, envelopeError(error));
      return;
    }
    sendJson(res, 500, envelopeError(new ApiError("INTERNAL_ERROR", 500, "Lỗi không xác định")));
  }
}

/** Vite dev middleware phục vụ API nội bộ dashboard — đọc trực tiếp workspace/ trên filesystem. */
export function apiPlugin(): Plugin {
  return {
    name: "debqc-dashboard-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const path = url.pathname;
        const method = req.method ?? "GET";

        const projectMatch = /^\/api\/projects\/([^/]+)$/.exec(path);
        const runsMatch = /^\/api\/projects\/([^/]+)\/runs$/.exec(path);
        const reportMatch = /^\/api\/projects\/([^/]+)\/runs\/([^/]+)\/report$/.exec(path);
        const reviewMatch = /^\/api\/projects\/([^/]+)\/runs\/([^/]+)\/review$/.exec(path);
        const captureJobMatch = /^\/api\/projects\/([^/]+)\/capture-job$/.exec(path);
        const screensConfigMatch = /^\/api\/projects\/([^/]+)\/screens-config$/.exec(path);
        const locatorsMatch = /^\/api\/projects\/([^/]+)\/screens\/([^/]+)\/locators$/.exec(path);
        const locatorsImportTsMatch =
          /^\/api\/projects\/([^/]+)\/screens\/([^/]+)\/locators\/import-ts$/.exec(path);

        if (method === "GET" && path === "/api/projects") {
          await handle(res, () => listProjects(WORKSPACE_ROOT));
          return;
        }

        if (method === "POST" && path === "/api/projects") {
          await handle(res, async () => createProject(WORKSPACE_ROOT, await readJsonBody(req)));
          return;
        }

        if (method === "PATCH" && projectMatch) {
          const [, projectId] = projectMatch;
          await handle(res, async () => updateProject(WORKSPACE_ROOT, projectId as string, await readJsonBody(req)));
          return;
        }

        if (method === "DELETE" && projectMatch) {
          const [, projectId] = projectMatch;
          await handle(res, () => deleteProject(WORKSPACE_ROOT, projectId as string));
          return;
        }

        if (method === "GET" && runsMatch) {
          const [, projectId] = runsMatch;
          await handle(res, () => listRuns(WORKSPACE_ROOT, projectId as string));
          return;
        }

        if (method === "GET" && reportMatch) {
          const [, projectId, runId] = reportMatch;
          await handle(res, () => getReport(WORKSPACE_ROOT, projectId as string, runId as string));
          return;
        }

        if (method === "POST" && reviewMatch) {
          const [, projectId, runId] = reviewMatch;
          await handle(res, () => reviewRun(WORKSPACE_ROOT, projectId as string, runId as string));
          return;
        }

        if (method === "POST" && captureJobMatch) {
          const [, projectId] = captureJobMatch;
          await handle(res, () => triggerRun(WORKSPACE_ROOT, projectId as string));
          return;
        }

        if (method === "GET" && captureJobMatch) {
          const [, projectId] = captureJobMatch;
          await handle(res, () => getRunJob(WORKSPACE_ROOT, projectId as string));
          return;
        }

        if (method === "GET" && screensConfigMatch) {
          const [, projectId] = screensConfigMatch;
          await handle(res, () => getScreensConfig(WORKSPACE_ROOT, projectId as string));
          return;
        }

        if (method === "PATCH" && screensConfigMatch) {
          const [, projectId] = screensConfigMatch;
          await handle(res, async () =>
            updateScreensConfig(WORKSPACE_ROOT, projectId as string, await readJsonBody(req)),
          );
          return;
        }

        if (method === "GET" && locatorsMatch) {
          const [, projectId, screenId] = locatorsMatch;
          await handle(res, () => getLocatorsFile(WORKSPACE_ROOT, projectId as string, screenId as string));
          return;
        }

        if (method === "PATCH" && locatorsMatch) {
          const [, projectId, screenId] = locatorsMatch;
          await handle(res, async () =>
            updateLocatorsFile(WORKSPACE_ROOT, projectId as string, screenId as string, await readJsonBody(req)),
          );
          return;
        }

        if (method === "POST" && locatorsImportTsMatch) {
          const [, projectId, screenId] = locatorsImportTsMatch;
          await handle(res, async () =>
            parseTsLocatorImport(WORKSPACE_ROOT, projectId as string, screenId as string, await readJsonBody(req)),
          );
          return;
        }

        next();
      });
    },
  };
}
