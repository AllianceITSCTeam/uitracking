import { fileURLToPath } from "node:url";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeBrowser, getBrowser } from "./browser.js";
import { resolveLocator } from "./locator-resolver.js";
import { extractControl } from "./snapshot-extractor.js";
import type { FixtureServer } from "./test-helpers/static-server.js";
import { startFixtureServer } from "./test-helpers/static-server.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);

describe("extractControl", () => {
  let server: FixtureServer;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await startFixtureServer(FIXTURE_HTML_DIR);
    browser = await getBrowser();
  }, 20_000);

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(`${server.url}/customer-edit.html`);
  });

  afterAll(async () => {
    await server.close();
    await closeBrowser();
  });

  it("extracts an input field's type and label", async () => {
    const resolved = await resolveLocator(page, { strategy: "getByTestId", value: "customer-email" });
    if (!resolved.ok) throw new Error("expected ok");

    const control = await extractControl(resolved.handle, { key: "field.email", locator: { strategy: "getByTestId", value: "customer-email" } }, 0);

    expect(control.key).toBe("field.email");
    expect(control.tag).toBe("input");
    expect(control.type).toBe("email");
    expect(control.text.label).toBe("Email");
    expect(control.order).toBe(0);
  });

  it("extracts a select field's options", async () => {
    const resolved = await resolveLocator(page, { strategy: "getByLabel", value: "Trạng thái" });
    if (!resolved.ok) throw new Error("expected ok");

    const control = await extractControl(resolved.handle, { key: "field.status", locator: { strategy: "getByLabel", value: "Trạng thái" } }, 1);

    expect(control.tag).toBe("select");
    expect(control.options).toEqual(["Hoạt động", "Ngừng hoạt động"]);
  });

  it("extracts a table's header-only structure, not row data", async () => {
    const resolved = await resolveLocator(page, { strategy: "getByTestId", value: "customer-table" });
    if (!resolved.ok) throw new Error("expected ok");

    const control = await extractControl(resolved.handle, { key: "table.customers", locator: { strategy: "getByTestId", value: "customer-table" } }, 2);

    expect(control.tag).toBe("table");
    expect(control.options).toEqual(["Tên", "Email", "Trạng thái"]);
  });
});
