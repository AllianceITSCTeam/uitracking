import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { closeBrowser, getBrowser, resolveLocator } from "capture";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { suggestLocator } from "./suggest-locator.js";

const FIXTURE_HTML = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html/customer-edit.html", import.meta.url),
);

describe("suggestLocator", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await getBrowser();
  }, 20_000);

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterAll(async () => {
    await closeBrowser();
  });

  it("chọn getByTestId khi phần tử có data-testid duy nhất", async () => {
    await page.setContent(readFileSync(FIXTURE_HTML, "utf-8"));
    const target = page.locator("#email");

    const suggested = await suggestLocator(page, target);

    expect(suggested).toEqual({ strategy: "getByTestId", value: "customer-email" });
  });

  it("chọn getByLabel khi phần tử không có testid nhưng có label gắn for=id", async () => {
    await page.setContent(readFileSync(FIXTURE_HTML, "utf-8"));
    const target = page.locator("#status");

    const suggested = await suggestLocator(page, target);

    expect(suggested).toEqual({ strategy: "getByLabel", value: "Trạng thái" });
  });

  it("chọn getByRole khi phần tử là button không testid/label, dùng text làm accessible name", async () => {
    await page.setContent(readFileSync(FIXTURE_HTML, "utf-8"));
    const target = page.locator("button[type=submit]");

    const suggested = await suggestLocator(page, target);

    expect(suggested).toEqual({ strategy: "getByRole", value: "button", options: { name: "Lưu" } });
  });

  it("bỏ qua tier testid khi data-testid bị trùng, rơi xuống tier kế tiếp", async () => {
    await page.setContent(`
      <div data-testid="dup">A</div>
      <div data-testid="dup" aria-label="second">B</div>
    `);
    const target = page.locator("div", { hasText: "B" });

    const suggested = await suggestLocator(page, target);

    expect(suggested.strategy).not.toBe("getByTestId");
    expect(suggested).toEqual({ strategy: "getByText", value: "B", options: { exact: true } });
  });

  it("rơi xuống css path duy nhất khi không tier nào khớp", async () => {
    await page.setContent(`
      <div><span>x</span><span>x</span></div>
    `);
    const target = page.locator("span").nth(1);

    const suggested = await suggestLocator(page, target);

    expect(suggested.strategy).toBe("css");
    const resolved = await resolveLocator(page, suggested);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(await resolved.handle.evaluate((el) => el === document.querySelectorAll("span")[1])).toBe(true);
    }
  });
});
