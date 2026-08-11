import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadScreensConfig } from "./config-loader.js";
import { buildScreensConfigPath } from "./paths.js";
import { writeScreensConfig } from "./screens-config-writer.js";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-screens-config-writer-"));
});

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("writeScreensConfig", () => {
  it("writes screens.config.yaml that loadScreensConfig can read back", () => {
    writeScreensConfig(workspaceRoot, "myapp", {
      baseUrl: "https://example.com",
      locales: ["vi"],
      screens: [{ id: "home", url: "/", track: ["text"] }],
    });

    const result = loadScreensConfig(buildScreensConfigPath(workspaceRoot, "myapp"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      baseUrl: "https://example.com",
      locales: ["vi"],
      screens: [{ id: "home", url: "/", track: ["text"] }],
    });
  });

  it("throws when the data does not satisfy ScreensConfigSchema", () => {
    expect(() =>
      writeScreensConfig(workspaceRoot, "myapp", {
        baseUrl: "not-a-url",
        locales: ["vi"],
        screens: [{ id: "home", url: "/", track: [] }],
      } as never),
    ).toThrow();
  });
});
