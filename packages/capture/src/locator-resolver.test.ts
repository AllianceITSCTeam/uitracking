import { fileURLToPath } from "node:url";
import type { Locator as RegistryLocator } from "core";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeBrowser, getBrowser } from "./browser.js";
import { resolveLocator } from "./locator-resolver.js";
import type { FixtureServer } from "./test-helpers/static-server.js";
import { startFixtureServer } from "./test-helpers/static-server.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);

describe("resolveLocator", () => {
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

  it("resolves ok with the handle when exactly one element matches", async () => {
    const locator: RegistryLocator = { strategy: "getByTestId", value: "customer-email" };
    const result = await resolveLocator(page, locator);

    expect(result.ok).toBe(true);
    if (result.ok) {
      await expect(result.handle.inputValue()).resolves.toBe("qa@example.com");
    }
  });

  it("returns NOT_FOUND when no element matches", async () => {
    const locator: RegistryLocator = { strategy: "getByTestId", value: "does-not-exist" };
    const result = await resolveLocator(page, locator);

    expect(result).toEqual({ ok: false, reason: "NOT_FOUND", count: 0 });
  });

  it("returns AMBIGUOUS when more than one element matches", async () => {
    const locator: RegistryLocator = { strategy: "css", value: "td" };
    const result = await resolveLocator(page, locator);

    expect(result).toEqual({ ok: false, reason: "AMBIGUOUS", count: 6 });
  });
});
