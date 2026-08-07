import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { runValidateLocators } from "./validate-locators.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);
const REAL_LOCATORS_PATH = fileURLToPath(
  new URL(
    "../../../workspace/projects/fixture-app/locators/customer-edit.locators.yaml",
    import.meta.url,
  ),
);

const MIME_TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8" };

function startServer(rootDir: string): Promise<{ url: string; close: () => Promise<void> }> {
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

function writeTempWorkspace(baseUrl: string, locatorsYaml: string): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-cli-"));
  const projectDir = join(workspaceRoot, "projects/fixture-app");
  mkdirSync(join(projectDir, "locators"), { recursive: true });

  writeFileSync(
    join(workspaceRoot, "projects.yaml"),
    'projects:\n  - id: fixture-app\n    name: "Fixture App"\n    config: projects/fixture-app/screens.config.yaml\n',
  );
  writeFileSync(
    join(projectDir, "screens.config.yaml"),
    `baseUrl: ${baseUrl}\nlocales: [vi]\nscreens:\n  - id: customer-edit\n    url: /customer-edit.html\n    waitFor: "[data-testid=customer-table]"\n    track: [text, structure, style, options]\n`,
  );
  writeFileSync(join(projectDir, "locators/customer-edit.locators.yaml"), locatorsYaml);

  return workspaceRoot;
}

describe("runValidateLocators", () => {
  let server: { url: string; close: () => Promise<void> };
  let workspaceRoot: string | undefined;

  beforeAll(async () => {
    server = await startServer(FIXTURE_HTML_DIR);
  });

  afterAll(async () => {
    await server.close();
  });

  afterEach(() => {
    if (workspaceRoot) {
      rmSync(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = undefined;
    }
  });

  it(
    "returns 0 and logs OK for every control when the whole registry resolves",
    async () => {
      const locatorsYaml = readFileSync(REAL_LOCATORS_PATH, "utf-8");
      workspaceRoot = writeTempWorkspace(server.url, locatorsYaml);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

      const exitCode = await runValidateLocators("fixture-app", workspaceRoot);

      expect(exitCode).toBe(0);
      const okLines = logSpy.mock.calls.map((call) => call[0]).filter((line) => String(line).endsWith("OK"));
      expect(okLines).toHaveLength(4);
      logSpy.mockRestore();
    },
    20_000,
  );

  it(
    "returns 1 and logs NOT_FOUND when a control locator does not resolve",
    async () => {
      const locatorsYaml =
        "screen: customer-edit\ncontrols:\n  - key: field.ghost\n    locator:\n      strategy: getByTestId\n      value: does-not-exist\n";
      workspaceRoot = writeTempWorkspace(server.url, locatorsYaml);
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

      const exitCode = await runValidateLocators("fixture-app", workspaceRoot);

      expect(exitCode).toBe(1);
      expect(logSpy.mock.calls.some((call) => String(call[0]).includes("NOT_FOUND"))).toBe(true);
      logSpy.mockRestore();
    },
    20_000,
  );

  it("returns 1 when the project id is not found in projects.yaml", async () => {
    const locatorsYaml = readFileSync(REAL_LOCATORS_PATH, "utf-8");
    workspaceRoot = writeTempWorkspace(server.url, locatorsYaml);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runValidateLocators("does-not-exist", workspaceRoot);

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
  });
});
