import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { loadLocatorsFile, loadProjectsFile, loadScreensConfig } from "./config-loader.js";

const WORKSPACE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../workspace");

let tmpDir: string | undefined;

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe("loadProjectsFile", () => {
  it("parses workspace/projects.yaml", () => {
    const result = loadProjectsFile(join(WORKSPACE_ROOT, "projects.yaml"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.projects.map((p) => p.id)).toEqual(["fixture-app"]);
  });

  it("reports file + field for a missing required field", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "debqc-config-loader-"));
    const file = join(tmpDir, "projects.yaml");
    writeFileSync(file, "projects:\n  - id: myapp\n    config: screens.config.yaml\n");

    const result = loadProjectsFile(file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      { file, field: "projects.0.name", message: "Required" },
    ]);
  });

  it("reports the file as the field when it cannot be read", () => {
    const file = join(tmpdir(), "debqc-config-loader-does-not-exist.yaml");

    const result = loadProjectsFile(file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.file).toBe(file);
    expect(result.errors[0]?.field).toBe("<file>");
  });
});

describe("loadScreensConfig", () => {
  it("parses workspace/projects/fixture-app/screens.config.yaml", () => {
    const result = loadScreensConfig(
      join(WORKSPACE_ROOT, "projects/fixture-app/screens.config.yaml"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.screens.map((s) => s.id)).toEqual(["customer-edit"]);
  });

  it("reports file + field for an invalid baseUrl", () => {
    tmpDir = mkdtempSync(join(tmpdir(), "debqc-config-loader-"));
    const file = join(tmpDir, "screens.config.yaml");
    writeFileSync(
      file,
      'baseUrl: "not-a-url"\nlocales: [vi]\nscreens:\n  - id: a\n    url: /a\n    track: [text]\n',
    );

    const result = loadScreensConfig(file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      { file, field: "baseUrl", message: "Invalid url" },
    ]);
  });
});

describe("loadLocatorsFile", () => {
  it("parses workspace/projects/fixture-app/locators/customer-edit.locators.yaml", () => {
    const result = loadLocatorsFile(
      join(WORKSPACE_ROOT, "projects/fixture-app/locators/customer-edit.locators.yaml"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.controls).toHaveLength(4);
  });
});
