import { chromium } from "playwright";
import type { Browser, BrowserContext, BrowserContextOptions } from "playwright";

let browserPromise: Promise<Browser> | undefined;

/** Singleton Browser cho cả vòng đời process — launch lười, tái dùng. */
export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = undefined;
  await browser.close();
}

/** Mở 1 Context, chạy `fn`, luôn đóng Context (kể cả khi `fn` throw) — không leak context/page. */
export async function withContext<T>(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  fn: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext(contextOptions);
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}
