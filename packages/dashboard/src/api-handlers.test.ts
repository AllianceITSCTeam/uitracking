import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendHistoryEntry, writeReport } from "core/node";
import type { Report } from "core";
import {
  ApiError,
  createProject,
  deleteProject,
  getLocatorsFile,
  getReport,
  getScreensConfig,
  listProjects,
  listRuns,
  parseTsLocatorImport,
  reviewRun,
  updateLocatorsFile,
  updateProject,
  updateScreensConfig,
} from "./api-handlers.js";

function writeWorkspace(root: string): void {
  mkdirSync(join(root, "projects", "fixture-app"), { recursive: true });
  writeFileSync(
    root + "/projects.yaml",
    "projects:\n  - id: fixture-app\n    name: Fixture\n    config: projects/fixture-app/screens.config.yaml\n",
  );
}

const REPORT: Report = {
  runId: "run-1",
  project: "fixture-app",
  startedAt: "2026-08-10T00:00:00.000Z",
  finishedAt: "2026-08-10T00:00:05.000Z",
  screens: [],
  severityCounts: { CRITICAL: 0, MAJOR: 0, MINOR: 0, INFO: 0 },
};

describe("api-handlers", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-api-handlers-"));
    writeWorkspace(workspaceRoot);
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("listProjects returns projects from projects.yaml", () => {
    const projects = listProjects(workspaceRoot);
    expect(projects).toEqual([{ id: "fixture-app", name: "Fixture" }]);
  });

  it("listRuns returns history entries newest-first", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", { runId: "run-1", capturedAt: "2026-08-10T00:00:00.000Z" });
    appendHistoryEntry(workspaceRoot, "fixture-app", { runId: "run-2", capturedAt: "2026-08-10T01:00:00.000Z" });

    const runs = listRuns(workspaceRoot, "fixture-app");

    expect(runs.map((r) => r.runId)).toEqual(["run-2", "run-1"]);
  });

  it("listRuns throws PROJECT_NOT_FOUND for unknown project", () => {
    expect.assertions(2);
    try {
      listRuns(workspaceRoot, "unknown-app");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("getReport returns the parsed report.json", () => {
    writeReport(workspaceRoot, "fixture-app", "run-1", REPORT);

    const report = getReport(workspaceRoot, "fixture-app", "run-1");

    expect(report).toEqual(REPORT);
  });

  it("getReport throws RUN_NOT_FOUND when report.json is missing", () => {
    expect.assertions(2);
    try {
      getReport(workspaceRoot, "fixture-app", "run-missing");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("RUN_NOT_FOUND");
    }
  });

  it("reviewRun marks the run reviewed and returns the updated entry", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", { runId: "run-1", capturedAt: "2026-08-10T00:00:00.000Z" });

    const entry = reviewRun(workspaceRoot, "fixture-app", "run-1");

    expect(entry.runId).toBe("run-1");
    expect(entry.reviewedAt).toEqual(expect.any(String));
  });

  it("reviewRun throws RUN_NOT_FOUND for unknown runId", () => {
    appendHistoryEntry(workspaceRoot, "fixture-app", { runId: "run-1", capturedAt: "2026-08-10T00:00:00.000Z" });

    expect.assertions(2);
    try {
      reviewRun(workspaceRoot, "fixture-app", "run-missing");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("RUN_NOT_FOUND");
    }
  });

  it("createProject adds an entry and a stub screens.config.yaml", () => {
    const project = createProject(workspaceRoot, { id: "myapp", name: "My App" });

    expect(project).toEqual({ id: "myapp", name: "My App" });
    expect(listProjects(workspaceRoot)).toContainEqual({ id: "myapp", name: "My App" });
    expect(existsSync(join(workspaceRoot, "projects", "myapp", "screens.config.yaml"))).toBe(true);
  });

  it("createProject throws PROJECT_ID_DUPLICATE when the id already exists", () => {
    expect.assertions(2);
    try {
      createProject(workspaceRoot, { id: "fixture-app", name: "Duplicate" });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("PROJECT_ID_DUPLICATE");
    }
  });

  it("createProject throws VALIDATION_ERROR with fieldErrors for a blank name", () => {
    expect.assertions(3);
    try {
      createProject(workspaceRoot, { id: "myapp", name: "  " });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("VALIDATION_ERROR");
      expect((error as ApiError).fieldErrors).toEqual({ name: ["Bắt buộc"] });
    }
  });

  it("updateProject renames a project", () => {
    const updated = updateProject(workspaceRoot, "fixture-app", { name: "Renamed" });

    expect(updated).toEqual({ id: "fixture-app", name: "Renamed" });
    expect(listProjects(workspaceRoot)).toEqual([{ id: "fixture-app", name: "Renamed" }]);
  });

  it("updateProject throws PROJECT_NOT_FOUND for unknown id", () => {
    expect.assertions(2);
    try {
      updateProject(workspaceRoot, "unknown-app", { name: "Renamed" });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("deleteProject removes the entry but keeps the project directory", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    deleteProject(workspaceRoot, "myapp");

    expect(listProjects(workspaceRoot)).toEqual([{ id: "fixture-app", name: "Fixture" }]);
    expect(existsSync(join(workspaceRoot, "projects", "myapp", "screens.config.yaml"))).toBe(true);
  });

  it("deleteProject throws LAST_PROJECT_FORBIDDEN when it is the only project left", () => {
    expect.assertions(2);
    try {
      deleteProject(workspaceRoot, "fixture-app");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("LAST_PROJECT_FORBIDDEN");
    }
  });

  it("getScreensConfig returns the stub written by createProject", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    const config = getScreensConfig(workspaceRoot, "myapp");

    expect(config.baseUrl).toBe("https://example.com");
  });

  it("getScreensConfig throws PROJECT_NOT_FOUND for unknown project", () => {
    expect.assertions(2);
    try {
      getScreensConfig(workspaceRoot, "unknown-app");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("updateScreensConfig writes the new config and getScreensConfig reads it back", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    updateScreensConfig(workspaceRoot, "myapp", {
      baseUrl: "https://myapp.test",
      locales: ["vi", "en"],
      screens: [{ id: "home", url: "/", track: ["text", "structure"] }],
    });

    expect(getScreensConfig(workspaceRoot, "myapp")).toEqual({
      baseUrl: "https://myapp.test",
      locales: ["vi", "en"],
      screens: [{ id: "home", url: "/", track: ["text", "structure"] }],
    });
  });

  it("updateScreensConfig throws VALIDATION_ERROR with fieldErrors for an invalid baseUrl", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    expect.assertions(3);
    try {
      updateScreensConfig(workspaceRoot, "myapp", {
        baseUrl: "not-a-url",
        locales: ["vi"],
        screens: [{ id: "home", url: "/", track: [] }],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("VALIDATION_ERROR");
      expect((error as ApiError).fieldErrors).toHaveProperty("baseUrl");
    }
  });

  it("getLocatorsFile returns an empty control list when the file does not exist yet", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    expect(getLocatorsFile(workspaceRoot, "myapp", "home")).toEqual({ screen: "home", controls: [] });
  });

  it("updateLocatorsFile writes controls and getLocatorsFile reads them back", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    updateLocatorsFile(workspaceRoot, "myapp", "home", {
      screen: "home",
      controls: [{ key: "btn.submit", locator: { strategy: "getByRole", value: "button" } }],
    });

    expect(getLocatorsFile(workspaceRoot, "myapp", "home")).toEqual({
      screen: "home",
      controls: [{ key: "btn.submit", locator: { strategy: "getByRole", value: "button" } }],
    });
  });

  it("updateLocatorsFile throws VALIDATION_ERROR for an unknown locator strategy", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    expect.assertions(2);
    try {
      updateLocatorsFile(workspaceRoot, "myapp", "home", {
        screen: "home",
        controls: [{ key: "btn.submit", locator: { strategy: "getByMagic", value: "button" } }],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("parseTsLocatorImport converts static getters and returns skipped entries", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    const source = `
      export class Locators {
        get loginButton(): Locator {
          return this.page.getByTestId('btn-login');
        }
        assetTypeCard(label: string): Locator {
          return this.page.locator('.card').filter({ hasText: label });
        }
      }
    `;

    const result = parseTsLocatorImport(workspaceRoot, "myapp", "home", { source });

    expect(result.file).toEqual({
      screen: "home",
      controls: [{ key: "loginButton", locator: { strategy: "getByTestId", value: "btn-login" } }],
    });
    expect(result.skipped).toEqual([
      { name: "assetTypeCard", reason: "Có tham số, không convert được sang giá trị tĩnh" },
    ]);
  });

  it("parseTsLocatorImport throws VALIDATION_ERROR when source is missing", () => {
    createProject(workspaceRoot, { id: "myapp", name: "My App" });

    expect.assertions(2);
    try {
      parseTsLocatorImport(workspaceRoot, "myapp", "home", {});
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    }
  });
});
