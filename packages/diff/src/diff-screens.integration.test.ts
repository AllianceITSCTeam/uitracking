import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { extname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { captureScreen, closeBrowser, getBrowser } from "capture";
import type { RegistryControl } from "core";
import type { Browser, BrowserContext } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { diffScreens } from "./diff-screens.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);

const MIME_TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8" };

type FixtureServer = { url: string; close: () => Promise<void> };

/** Server tĩnh chỉ dùng trong test này — mirror của capture/test-helpers/static-server.ts (không public). */
function startFixtureServer(rootDir: string): Promise<FixtureServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const requestPath = (req.url ?? "/").split("?")[0] ?? "/";
      const filePath = join(rootDir, requestPath === "/" ? "/index.html" : requestPath);
      readFileAsync(filePath)
        .then((body) => {
          res.writeHead(200, { "Content-Type": MIME_TYPES[extname(filePath)] ?? "text/plain" });
          res.end(body);
        })
        .catch(() => {
          res.writeHead(404);
          res.end("Not found");
        });
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Failed to bind test server"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

const REGISTRY_CONTROLS: RegistryControl[] = [
  { key: "field.email", locator: { strategy: "getByTestId", value: "customer-email" } },
  { key: "field.status", locator: { strategy: "getByLabel", value: "Trạng thái" } },
  { key: "btn.submit", locator: { strategy: "getByRole", value: "button", options: { name: "Lưu" } } },
  { key: "table.customers", locator: { strategy: "getByTestId", value: "customer-table" } },
];

/** Bản HTML thứ 2: đổi text label email (TEXT_CHANGED), thêm option trạng thái (OPTIONS_CHANGED),
 *  xoá data-testid của bảng khách hàng để gây LOCATOR_BROKEN. */
function writeModifiedHtml(dir: string): void {
  const original = readFileSync(join(FIXTURE_HTML_DIR, "customer-edit.html"), "utf-8");
  const modified = original
    .replace('<label for="email">Email</label>', '<label for="email">Email liên hệ</label>')
    .replace(
      '<option value="inactive">Ngừng hoạt động</option>',
      '<option value="inactive">Ngừng hoạt động</option>\n        <option value="pending">Chờ duyệt</option>',
    )
    .replace('<table data-testid="customer-table">', "<table>");

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "customer-edit.html"), modified);
}

describe("diffScreens against two real captures", () => {
  let baselineServer: FixtureServer;
  let modifiedServer: FixtureServer;
  let modifiedDir: string;
  let browser: Browser;
  let context: BrowserContext;

  beforeAll(async () => {
    baselineServer = await startFixtureServer(FIXTURE_HTML_DIR);
    modifiedDir = mkdtempSync(join(tmpdir(), "debqc-diff-fixture-"));
    writeModifiedHtml(modifiedDir);
    modifiedServer = await startFixtureServer(modifiedDir);
    browser = await getBrowser();
  }, 20_000);

  afterEach(async () => {
    await context?.close();
  });

  afterAll(async () => {
    await baselineServer.close();
    await modifiedServer.close();
    await closeBrowser();
    rmSync(modifiedDir, { recursive: true, force: true });
  });

  it(
    "classifies TEXT_CHANGED, OPTIONS_CHANGED, and LOCATOR_BROKEN across two real captures",
    async () => {
      context = await browser.newContext();
      const baseline = await captureScreen(
        context,
        baselineServer.url,
        { id: "customer-edit", url: "/customer-edit.html", track: ["text", "type", "options"] },
        "vi",
        undefined,
        REGISTRY_CONTROLS,
      );
      await context.close();

      context = await browser.newContext();
      const updated = await captureScreen(
        context,
        modifiedServer.url,
        { id: "customer-edit", url: "/customer-edit.html", track: ["text", "type", "options"] },
        "vi",
        undefined,
        REGISTRY_CONTROLS,
      );

      expect(baseline.broken).toEqual([]);
      expect(updated.broken).toEqual([{ key: "table.customers", reason: "NOT_FOUND", count: 0 }]);

      const report = diffScreens({
        runId: "run-2",
        project: "fixture-app",
        locale: "vi",
        previous: baseline.screen,
        current: updated.screen,
        broken: updated.broken,
      });

      const changeTypesByKey = new Map(report.changes.map((change) => [change.key, change.changeType]));

      expect(changeTypesByKey.get("field.email")).toBe("TEXT_CHANGED");
      expect(changeTypesByKey.get("field.status")).toBe("OPTIONS_CHANGED");
      expect(changeTypesByKey.get("table.customers")).toBe("LOCATOR_BROKEN");
      expect(changeTypesByKey.has("btn.submit")).toBe(false);

      const broken = report.changes.find((change) => change.key === "table.customers");
      expect(broken?.severity).toBe("CRITICAL");
    },
    20_000,
  );
});
