import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import type { Report } from "core";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { runTrackRun } from "./run.js";

const FIXTURE_DIR = fileURLToPath(new URL("../../../workspace", import.meta.url));

const MIME_TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8" };

type FixtureServer = { url: string; close: () => Promise<void> };

/** Server tĩnh chỉ dùng trong test này — mirror của diff-screens.integration.test.ts. */
function startFixtureServer(rootDir: string): Promise<FixtureServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const requestPath = (req.url ?? "/").split("?")[0] ?? "/";
      const filePath = join(rootDir, requestPath === "/" ? "/index.html" : requestPath);
      readFileAsync(filePath)
        .then((body) => {
          res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] ?? "text/plain" });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(404);
          res.end("Not found");
        });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to bind test server"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

function writeWorkspace(root: string, baseUrl: string): void {
  mkdirSync(join(root, "projects", "fixture-app", "locators"), { recursive: true });
  writeFileSync(join(root, "projects.yaml"), "projects:\n  - id: fixture-app\n    name: Fixture\n    config: projects/fixture-app/screens.config.yaml\n");
  writeFileSync(
    join(root, "projects", "fixture-app", "screens.config.yaml"),
    `baseUrl: ${baseUrl}\nlocales: [vi]\n\nscreens:\n  - id: customer-edit\n    url: /customer-edit.html\n    waitFor: "[data-testid=customer-table]"\n    track: [text, structure, style, options]\n`,
  );
  const locators = readFileSync(
    join(FIXTURE_DIR, "projects", "fixture-app", "locators", "customer-edit.locators.yaml"),
    "utf-8",
  );
  writeFileSync(join(root, "projects", "fixture-app", "locators", "customer-edit.locators.yaml"), locators);
}

function readReport(root: string, runId: string): Report {
  const path = join(root, "projects", "fixture-app", "runs", runId, "report.json");
  return JSON.parse(readFileSync(path, "utf-8")) as Report;
}

function latestRunId(historyPath: string): string {
  const history = JSON.parse(readFileSync(historyPath, "utf-8")) as { runId: string }[];
  const last = history[history.length - 1];
  if (!last) throw new Error("history.json is empty");
  return last.runId;
}

describe("runTrackRun against the fixture HTML app", () => {
  let server: FixtureServer;
  let workspaceRoot: string;
  let htmlDir: string;

  beforeAll(async () => {
    htmlDir = mkdtempSync(join(tmpdir(), "debqc-run-html-"));
    for (const name of ["customer-edit.html", "login.html", "welcome.html"]) {
      writeFileSync(
        join(htmlDir, name),
        readFileSync(join(FIXTURE_DIR, "projects", "fixture-app", "html", name)),
      );
    }
    server = await startFixtureServer(htmlDir);
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-run-fixture-"));
    writeWorkspace(workspaceRoot, server.url);
  }, 20_000);

  afterAll(async () => {
    await server.close();
    rmSync(workspaceRoot, { recursive: true, force: true });
    rmSync(htmlDir, { recursive: true, force: true });
  });

  it(
    "captures, diffs against baseline, and writes report.json/report.html/history.json",
    async () => {
      const exitCode1 = await runTrackRun({ project: "fixture-app" }, workspaceRoot);
      expect(exitCode1).toBe(0);

      const historyPath = join(workspaceRoot, "projects", "fixture-app", "history.json");
      const history1 = JSON.parse(readFileSync(historyPath, "utf-8")) as unknown[];
      expect(history1).toHaveLength(1);

      const runId1 = latestRunId(historyPath);
      const report1 = readReport(workspaceRoot, runId1);
      expect(report1.project).toBe("fixture-app");
      const screen1 = report1.screens.find((s) => s.screenId === "customer-edit");
      expect(screen1?.changes.some((c) => c.changeType === "CONTROL_ADDED")).toBe(true);

      const htmlPath = join(workspaceRoot, "projects", "fixture-app", "runs", runId1, "report.html");
      const html1 = readFileSync(htmlPath, "utf-8");
      expect(html1).toContain("field.email");

      const originalHtml = readFileSync(join(htmlDir, "customer-edit.html"), "utf-8");
      const modifiedHtml = originalHtml.replace(
        '<label for="email">Email</label>',
        '<label for="email">Email liên hệ</label>',
      );
      writeFileSync(join(htmlDir, "customer-edit.html"), modifiedHtml);

      const exitCode2 = await runTrackRun({ project: "fixture-app" }, workspaceRoot);
      expect(exitCode2).toBe(0);

      const history2 = JSON.parse(readFileSync(historyPath, "utf-8")) as unknown[];
      expect(history2).toHaveLength(2);

      const runId2 = latestRunId(historyPath);
      const report2 = readReport(workspaceRoot, runId2);
      const screen2 = report2.screens.find((s) => s.screenId === "customer-edit");
      expect(screen2?.changes.some((c) => c.changeType === "TEXT_CHANGED")).toBe(true);
    },
    30_000,
  );
});

describe("runTrackRun option validation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 1 when both --project and --all are given", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runTrackRun({ project: "fixture-app", all: true }, "workspace");

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
  });

  it("returns 1 when neither --project nor --all is given", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runTrackRun({}, "workspace");

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
  });

  it("returns 1 when --project references a project not in projects.yaml", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-run-badproject-"));
    writeFileSync(join(workspaceRoot, "projects.yaml"), "projects: []\n");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runTrackRun({ project: "does-not-exist" }, workspaceRoot);

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
    rmSync(workspaceRoot, { recursive: true, force: true });
  });
});
