import type { Control, LocaleSwitch, RegistryControl, Screen, ScreenConfig } from "core";
import type { BrowserContext, Locator as PlaywrightLocator } from "playwright";
import { resolveLocator } from "./locator-resolver.js";
import { extractControl } from "./snapshot-extractor.js";
import { runSteps } from "./step-runner.js";

export type BrokenControl = { key: string; reason: "NOT_FOUND" | "AMBIGUOUS"; count: number };

export type CaptureScreenResult = { screen: Screen; broken: BrokenControl[] };

function mergeQuery(url: URL, queryTemplate: string): void {
  const cleaned = queryTemplate.startsWith("?") ? queryTemplate.slice(1) : queryTemplate;
  const params = new URLSearchParams(url.search);
  for (const pair of cleaned.split("&")) {
    const [key, value] = pair.split("=");
    if (key) params.set(key, value ?? "");
  }
  url.search = params.toString();
}

/** Áp `localeSwitch` cho `locale` — url: trả query template để merge vào URL; cookie: set cookie trên context. */
async function applyLocaleSwitch(
  context: BrowserContext,
  baseUrl: string,
  locale: string,
  localeSwitch: LocaleSwitch,
): Promise<string | undefined> {
  const resolvedPattern = localeSwitch.pattern.replace("{locale}", locale);

  if (localeSwitch.strategy === "url") {
    return resolvedPattern;
  }

  if (localeSwitch.strategy === "cookie") {
    const separatorIndex = localeSwitch.pattern.indexOf("=");
    const name = localeSwitch.pattern.slice(0, separatorIndex);
    const value = resolvedPattern.slice(separatorIndex + 1);
    await context.addCookies([{ name, value, url: baseUrl }]);
    return undefined;
  }

  throw new Error(`localeSwitch strategy "${localeSwitch.strategy}" is not yet supported`);
}

async function domOrderIndex(handle: PlaywrightLocator): Promise<number> {
  return handle.evaluate((el) => Array.from(el.ownerDocument.querySelectorAll("*")).indexOf(el));
}

/** Capture 1 screen ở 1 locale: điều hướng, chạy scenario, resolve+extract từng control theo thứ tự DOM. */
export async function captureScreen(
  context: BrowserContext,
  baseUrl: string,
  screenConfig: ScreenConfig,
  locale: string,
  localeSwitch: LocaleSwitch | undefined,
  registryControls: RegistryControl[],
): Promise<CaptureScreenResult> {
  const queryTemplate = localeSwitch
    ? await applyLocaleSwitch(context, baseUrl, locale, localeSwitch)
    : undefined;

  const targetUrl = new URL(screenConfig.url, baseUrl);
  if (queryTemplate) mergeQuery(targetUrl, queryTemplate);

  const page = await context.newPage();
  await page.goto(targetUrl.toString());

  if (screenConfig.scenario) {
    await runSteps(page, screenConfig.scenario);
  }
  if (screenConfig.waitFor) {
    await page.waitForSelector(screenConfig.waitFor);
  }

  const broken: BrokenControl[] = [];
  const resolvedEntries: { registryControl: RegistryControl; handle: PlaywrightLocator; domIndex: number }[] = [];

  for (const registryControl of registryControls) {
    const resolved = await resolveLocator(page, registryControl.locator);
    if (!resolved.ok) {
      broken.push({ key: registryControl.key, reason: resolved.reason, count: resolved.count });
      continue;
    }
    const domIndex = await domOrderIndex(resolved.handle);
    resolvedEntries.push({ registryControl, handle: resolved.handle, domIndex });
  }

  resolvedEntries.sort((a, b) => a.domIndex - b.domIndex);

  const controls: Control[] = [];
  for (const [order, entry] of resolvedEntries.entries()) {
    controls.push(await extractControl(entry.handle, entry.registryControl, order));
  }

  await page.close();

  return {
    screen: { id: screenConfig.id, locale, capturedAt: new Date().toISOString(), controls },
    broken,
  };
}
