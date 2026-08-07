import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { AuthConfig } from "core";
import type { Browser, BrowserContext, Page } from "playwright";
import { runSteps } from "./step-runner.js";

const ENV_VAR_PATTERN = /\$\{([A-Za-z0-9_]+)\}/g;

/** Thay `${VAR_NAME}` bằng biến môi trường; thiếu biến → throw rõ tên (fail fast, không login sai âm thầm). */
export function interpolateEnv(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (_match, name: string) => {
    const envValue = process.env[name];
    if (envValue === undefined) {
      throw new Error(`Missing environment variable "${name}" required by auth config`);
    }
    return envValue;
  });
}

/** Chạy các bước form login (`fill`/`click`/`waitFor`) trên 1 page đã điều hướng tới `loginUrl`. */
export async function login(page: Page, auth: AuthConfig, baseUrl: string): Promise<void> {
  await page.goto(new URL(auth.loginUrl, baseUrl).toString());

  const steps = auth.steps.map((step) =>
    "fill" in step ? { fill: step.fill, value: interpolateEnv(step.value) } : step,
  );
  await runSteps(page, steps);
}

/**
 * Trả một Context đã đăng nhập. Nếu `reuseSession` và `statePath` đã có storageState hợp lệ,
 * tái dùng thay vì login lại. Ngược lại: login rồi lưu storageState (nếu `reuseSession`).
 */
export async function getAuthenticatedContext(
  browser: Browser,
  auth: AuthConfig,
  baseUrl: string,
  statePath: string,
): Promise<BrowserContext> {
  if (auth.reuseSession && existsSync(statePath)) {
    return browser.newContext({ storageState: statePath });
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, auth, baseUrl);
  await page.close();

  if (auth.reuseSession) {
    await mkdir(dirname(statePath), { recursive: true });
    await context.storageState({ path: statePath });
  }

  return context;
}
