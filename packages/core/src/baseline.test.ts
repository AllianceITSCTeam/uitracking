import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readBaseline, writeBaseline } from "./baseline.js";
import type { Screen } from "./snapshot.js";

const SCREEN: Screen = {
  id: "customer-edit",
  locale: "vi",
  capturedAt: "2026-08-10T00:00:00.000Z",
  controls: [],
};

describe("readBaseline / writeBaseline", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-baseline-"));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it("returns null when no baseline has been written yet", () => {
    expect(readBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi")).toBeNull();
  });

  it("writes then reads back the same screen", () => {
    writeBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi", SCREEN);

    expect(readBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi")).toEqual(SCREEN);
  });

  it("overwrites an existing baseline without throwing", () => {
    writeBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi", SCREEN);

    const updated: Screen = { ...SCREEN, capturedAt: "2026-08-10T01:00:00.000Z" };
    expect(() => writeBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi", updated)).not.toThrow();
    expect(readBaseline(workspaceRoot, "fixture-app", "customer-edit", "vi")).toEqual(updated);
  });
});
