import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";
import { closeBrowser, getBrowser } from "capture";
import type { Browser, Page } from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegistryControl, Locator as RegistryLocator } from "core";
import { startRecorderSession } from "./record-session.js";

describe("startRecorderSession", () => {
  let browser: Browser;
  let page: Page;
  let workspaceRoot: string;

  beforeAll(async () => {
    browser = await getBrowser();
  }, 20_000);

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setContent(`
      <button data-testid="save-btn">Lưu</button>
    `);
    workspaceRoot = mkdtempSync(join(tmpdir(), "debqc-recorder-session-"));
    mkdirSync(join(workspaceRoot, "projects", "fixture-app"), { recursive: true });
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await closeBrowser();
  });

  it("click → đề xuất locator, hỏi key, nối vào registry trên đĩa", async () => {
    const promptKey = vi.fn(async () => "save.button");
    const onEntryAppended = vi.fn();

    await startRecorderSession(page, workspaceRoot, "fixture-app", "customer-edit", promptKey, onEntryAppended);
    await page.click("[data-testid=save-btn]");
    await expect.poll(() => onEntryAppended.mock.calls.length).toBe(1);

    const expectedLocator: RegistryLocator = { strategy: "getByTestId", value: "save-btn" };
    expect(promptKey).toHaveBeenCalledWith(expectedLocator);
    const appended: RegistryControl = onEntryAppended.mock.calls[0]?.[0];
    expect(appended).toEqual({ key: "save.button", locator: expectedLocator });

    const onDisk = yaml.load(
      readFileSync(
        join(workspaceRoot, "projects", "fixture-app", "locators", "customer-edit.locators.yaml"),
        "utf-8",
      ),
    );
    expect(onDisk).toEqual({ screen: "customer-edit", controls: [appended] });
  });

  it("promptKey trả null → bỏ qua, không ghi entry", async () => {
    const promptKey = vi.fn(async () => null);
    const onEntryAppended = vi.fn();

    await startRecorderSession(page, workspaceRoot, "fixture-app", "customer-edit", promptKey, onEntryAppended);
    await page.click("[data-testid=save-btn]");
    await expect.poll(() => promptKey.mock.calls.length).toBe(1);

    expect(onEntryAppended).not.toHaveBeenCalled();
  });

  it("key trùng đã có trong registry → báo lỗi qua onError, không crash session", async () => {
    const promptKey = vi.fn(async () => "save.button");
    const onError = vi.fn();

    await startRecorderSession(page, workspaceRoot, "fixture-app", "customer-edit", promptKey, undefined, onError);
    await page.click("[data-testid=save-btn]");
    await expect.poll(() => promptKey.mock.calls.length).toBe(1);

    await page.click("[data-testid=save-btn]");
    await expect.poll(() => onError.mock.calls.length).toBe(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });
});
