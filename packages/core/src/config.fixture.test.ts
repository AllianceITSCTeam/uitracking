import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { LocatorsFileSchema, ProjectsFileSchema, ScreensConfigSchema } from "./config.js";

const WORKSPACE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../workspace");

function loadYaml(relativePath: string): unknown {
  return yaml.load(readFileSync(join(WORKSPACE_ROOT, relativePath), "utf-8"));
}

describe("workspace/ fixture parses via Zod without error", () => {
  it("parses projects.yaml", () => {
    const result = ProjectsFileSchema.safeParse(loadYaml("projects.yaml"));

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.projects.map((p) => p.id)).toEqual(["fixture-app"]);
  });

  it("parses projects/fixture-app/screens.config.yaml", () => {
    const result = ScreensConfigSchema.safeParse(
      loadYaml("projects/fixture-app/screens.config.yaml"),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.screens.map((s) => s.id)).toEqual(["customer-edit"]);
  });

  it("parses projects/fixture-app/locators/customer-edit.locators.yaml", () => {
    const result = LocatorsFileSchema.safeParse(
      loadYaml("projects/fixture-app/locators/customer-edit.locators.yaml"),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.controls.map((c) => c.key)).toEqual([
      "field.email",
      "field.status",
      "btn.submit",
      "table.customers",
    ]);
  });
});
