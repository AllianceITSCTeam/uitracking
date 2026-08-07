import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AuthConfig } from "core";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { getAuthenticatedContext, interpolateEnv } from "./auth.js";
import { closeBrowser, getBrowser } from "./browser.js";
import type { FixtureServer } from "./test-helpers/static-server.js";
import { startFixtureServer } from "./test-helpers/static-server.js";

const FIXTURE_HTML_DIR = fileURLToPath(
  new URL("../../../workspace/projects/fixture-app/html", import.meta.url),
);

const AUTH: AuthConfig = {
  type: "form",
  loginUrl: "/login.html",
  reuseSession: true,
  steps: [
    { fill: '[data-testid="username"]', value: "qa" },
    { fill: '[data-testid="password"]', value: "${TEST_LOGIN_PASSWORD}" },
    { click: '[data-testid="submit"]' },
    { waitFor: '[data-testid="welcome"]' },
  ],
};

describe("interpolateEnv", () => {
  afterEach(() => {
    delete process.env["TEST_LOGIN_PASSWORD"];
  });

  it("replaces ${VAR} with the environment variable value", () => {
    process.env["TEST_LOGIN_PASSWORD"] = "secret";
    expect(interpolateEnv("pw=${TEST_LOGIN_PASSWORD}")).toBe("pw=secret");
  });

  it("throws with the missing variable name when unset", () => {
    expect(() => interpolateEnv("${TEST_LOGIN_PASSWORD}")).toThrow(/TEST_LOGIN_PASSWORD/);
  });
});

describe("getAuthenticatedContext", () => {
  let server: FixtureServer;
  let tempDir: string;

  beforeAll(async () => {
    server = await startFixtureServer(FIXTURE_HTML_DIR);
  });

  afterAll(async () => {
    await server.close();
    await closeBrowser();
  });

  afterEach(() => {
    delete process.env["TEST_LOGIN_PASSWORD"];
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it(
    "logs in and persists storageState when reuseSession is true",
    async () => {
      process.env["TEST_LOGIN_PASSWORD"] = "secret";
      tempDir = mkdtempSync(join(tmpdir(), "debqc-auth-"));
      const statePath = join(tempDir, "storageState.json");
      const browser = await getBrowser();

      const context = await getAuthenticatedContext(browser, AUTH, server.url, statePath);
      await context.close();

      expect(existsSync(statePath)).toBe(true);
    },
    20_000,
  );

  it(
    "reuses storageState on a second call instead of logging in again",
    async () => {
      process.env["TEST_LOGIN_PASSWORD"] = "secret";
      tempDir = mkdtempSync(join(tmpdir(), "debqc-auth-"));
      const statePath = join(tempDir, "storageState.json");
      const browser = await getBrowser();

      const first = await getAuthenticatedContext(browser, AUTH, server.url, statePath);
      await first.close();

      // baseUrl is now unreachable — a genuine re-login would fail to navigate.
      // Reuse must succeed anyway because it never calls login().
      const second = await getAuthenticatedContext(
        browser,
        AUTH,
        "http://127.0.0.1:1",
        statePath,
      );
      await second.close();
    },
    20_000,
  );
});
