import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadLocatorsFile } from "./config-loader.js";
import { buildLocatorsFilePath } from "./paths.js";
import { writeLocatorsFile } from "./locators-writer.js";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-locators-writer-"));
});

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true });
});

describe("writeLocatorsFile", () => {
  it("writes <screen>.locators.yaml (creating the locators dir) that loadLocatorsFile can read back", () => {
    writeLocatorsFile(workspaceRoot, "myapp", "home", {
      screen: "home",
      controls: [{ key: "btn.submit", locator: { strategy: "getByRole", value: "button" } }],
    });

    const result = loadLocatorsFile(buildLocatorsFilePath(workspaceRoot, "myapp", "home"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      screen: "home",
      controls: [{ key: "btn.submit", locator: { strategy: "getByRole", value: "button" } }],
    });
  });

  it("throws when a control's locator strategy is not in the enum", () => {
    expect(() =>
      writeLocatorsFile(workspaceRoot, "myapp", "home", {
        screen: "home",
        controls: [{ key: "btn.submit", locator: { strategy: "getByMagic", value: "button" } }],
      } as never),
    ).toThrow();
  });
});
