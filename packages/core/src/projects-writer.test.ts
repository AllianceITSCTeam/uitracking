import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadProjectsFile, loadScreensConfig } from "./config-loader.js";
import { ensureScreensConfigStub, writeProjectsFile } from "./projects-writer.js";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-projects-writer-"));
});

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("writeProjectsFile", () => {
  it("writes projects.yaml that loadProjectsFile can read back", () => {
    writeProjectsFile(workspaceRoot, {
      projects: [{ id: "myapp", name: "MyApp", config: "projects/myapp/screens.config.yaml" }],
    });

    const result = loadProjectsFile(join(workspaceRoot, "projects.yaml"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.projects).toEqual([
      { id: "myapp", name: "MyApp", config: "projects/myapp/screens.config.yaml" },
    ]);
  });

  it("throws when the data does not satisfy ProjectsFileSchema", () => {
    expect(() => writeProjectsFile(workspaceRoot, { projects: [] })).toThrow();
  });
});

describe("ensureScreensConfigStub", () => {
  it("creates a stub screens.config.yaml that loadScreensConfig can parse", () => {
    ensureScreensConfigStub(workspaceRoot, "myapp");

    const path = join(workspaceRoot, "projects", "myapp", "screens.config.yaml");
    expect(existsSync(path)).toBe(true);

    const result = loadScreensConfig(path);
    expect(result.ok).toBe(true);
  });

  it("does not overwrite an existing screens.config.yaml", () => {
    const path = join(workspaceRoot, "projects", "myapp", "screens.config.yaml");
    mkdirSync(join(workspaceRoot, "projects", "myapp"), { recursive: true });
    writeFileSync(path, "custom: true\n");

    ensureScreensConfigStub(workspaceRoot, "myapp");

    expect(readFileSync(path, "utf-8")).toBe("custom: true\n");
  });
});
