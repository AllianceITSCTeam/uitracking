import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RegistryControl } from "core";
import { appendLocatorEntry } from "./append-locator.js";

describe("appendLocatorEntry", () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-recorder-"));
    mkdirSync(join(workspaceRoot, "projects", "fixture-app"), { recursive: true });
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const entry: RegistryControl = {
    key: "customer.email",
    locator: { strategy: "getByTestId", value: "customer-email" },
  };

  it("tạo file locators mới khi chưa tồn tại", () => {
    const result = appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", entry);

    expect(result).toEqual({ screen: "customer-edit", controls: [entry] });
    const onDisk = yaml.load(
      readFileSync(
        join(workspaceRoot, "projects", "fixture-app", "locators", "customer-edit.locators.yaml"),
        "utf-8",
      ),
    );
    expect(onDisk).toEqual({ screen: "customer-edit", controls: [entry] });
  });

  it("nối control vào file đã có, giữ nguyên control cũ", () => {
    appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", entry);
    const second: RegistryControl = {
      key: "customer.status",
      locator: { strategy: "getByLabel", value: "Trạng thái" },
    };

    const result = appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", second);

    expect(result.controls).toEqual([entry, second]);
  });

  it("throw khi key đã tồn tại trong file", () => {
    appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", entry);

    expect(() => appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", entry)).toThrow(
      /customer\.email.*đã tồn tại/,
    );
  });

  it("throw khi file locators hiện có không hợp lệ", () => {
    const dir = join(workspaceRoot, "projects", "fixture-app", "locators");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "customer-edit.locators.yaml"), "screen: customer-edit\nunexpectedField: 1\n");

    expect(() => appendLocatorEntry(workspaceRoot, "fixture-app", "customer-edit", entry)).toThrow();
  });
});
