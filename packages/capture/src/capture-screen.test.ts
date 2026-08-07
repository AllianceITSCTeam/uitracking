import { fileURLToPath } from "node:url";
import type { RegistryControl } from "core";
import type { Browser, BrowserContext } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { closeBrowser, getBrowser } from "./browser.js";
import { captureScreen } from "./capture-screen.js";
import type { FixtureServer } from "./test-helpers/static-server.js";
import { startFixtureServer } from "./test-helpers/static-server.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);

// Deliberately listed out of DOM order (table before the form fields) —
// order in the resulting Screen.controls must reflect DOM position, not this list.
const REGISTRY_CONTROLS: RegistryControl[] = [
  { key: "table.customers", locator: { strategy: "getByTestId", value: "customer-table" } },
  { key: "btn.submit", locator: { strategy: "getByRole", value: "button", options: { name: "Lưu" } } },
  { key: "field.email", locator: { strategy: "getByTestId", value: "customer-email" } },
  { key: "field.status", locator: { strategy: "getByLabel", value: "Trạng thái" } },
];

describe("captureScreen", () => {
  let server: FixtureServer;
  let browser: Browser;
  let context: BrowserContext;

  beforeAll(async () => {
    server = await startFixtureServer(FIXTURE_HTML_DIR);
    browser = await getBrowser();
  }, 20_000);

  afterEach(async () => {
    await context?.close();
  });

  afterAll(async () => {
    await server.close();
    await closeBrowser();
  });

  it("captures controls ordered by DOM position and stamps a valid capturedAt", async () => {
    context = await browser.newContext();

    const result = await captureScreen(
      context,
      server.url,
      { id: "customer-edit", url: "/customer-edit.html", track: ["text", "type", "options"] },
      "vi",
      undefined,
      REGISTRY_CONTROLS,
    );

    expect(result.broken).toEqual([]);
    expect(result.screen.id).toBe("customer-edit");
    expect(result.screen.locale).toBe("vi");
    expect(new Date(result.screen.capturedAt).toISOString()).toBe(result.screen.capturedAt);
    expect(result.screen.controls.map((c) => c.key)).toEqual([
      "field.email",
      "field.status",
      "btn.submit",
      "table.customers",
    ]);
    expect(result.screen.controls.map((c) => c.order)).toEqual([0, 1, 2, 3]);
  });

  it("reports a control as broken when its locator resolves to nothing, without throwing", async () => {
    context = await browser.newContext();

    const registryControls: RegistryControl[] = [
      { key: "field.email", locator: { strategy: "getByTestId", value: "customer-email" } },
      { key: "field.ghost", locator: { strategy: "getByTestId", value: "does-not-exist" } },
    ];

    const result = await captureScreen(
      context,
      server.url,
      { id: "customer-edit", url: "/customer-edit.html", track: ["text"] },
      "vi",
      undefined,
      registryControls,
    );

    expect(result.broken).toEqual([{ key: "field.ghost", reason: "NOT_FOUND", count: 0 }]);
    expect(result.screen.controls.map((c) => c.key)).toEqual(["field.email"]);
  });
});
