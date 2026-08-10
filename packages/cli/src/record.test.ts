import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runRecord } from "./record.js";

function writeTempWorkspace(): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-cli-record-"));
  const projectDir = join(workspaceRoot, "projects/fixture-app");
  mkdirSync(projectDir, { recursive: true });

  writeFileSync(
    join(workspaceRoot, "projects.yaml"),
    'projects:\n  - id: fixture-app\n    name: "Fixture App"\n    config: projects/fixture-app/screens.config.yaml\n',
  );
  writeFileSync(
    join(projectDir, "screens.config.yaml"),
    "baseUrl: http://127.0.0.1:1\nlocales: [vi]\nscreens:\n  - id: customer-edit\n    url: /customer-edit.html\n    track: [text, structure, style, options]\n",
  );

  return workspaceRoot;
}

describe("runRecord", () => {
  let workspaceRoot: string | undefined;

  afterEach(() => {
    if (workspaceRoot) {
      rmSync(workspaceRoot, { recursive: true, force: true });
      workspaceRoot = undefined;
    }
  });

  it("trả exit code 1 khi project không tồn tại trong projects.yaml", async () => {
    workspaceRoot = writeTempWorkspace();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runRecord("does-not-exist", "customer-edit", workspaceRoot);

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
  });

  it("trả exit code 1 khi screen không tồn tại trong screens.config.yaml", async () => {
    workspaceRoot = writeTempWorkspace();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = await runRecord("fixture-app", "does-not-exist", workspaceRoot);

    expect(exitCode).toBe(1);
    errorSpy.mockRestore();
  });
});
