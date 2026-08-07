import type { Locator as RegistryLocator } from "core";
import type { Locator as PlaywrightLocator, Page } from "playwright";

export type ResolveResult =
  | { ok: true; handle: PlaywrightLocator }
  | { ok: false; reason: "NOT_FOUND" | "AMBIGUOUS"; count: number };

function buildLocator(page: Page, locator: RegistryLocator): PlaywrightLocator {
  const options = locator.options;
  switch (locator.strategy) {
    case "getByTestId":
      return page.getByTestId(locator.value);
    case "getByRole":
      return page.getByRole(locator.value as Parameters<Page["getByRole"]>[0], options);
    case "getByLabel":
      return page.getByLabel(locator.value, options);
    case "getByPlaceholder":
      return page.getByPlaceholder(locator.value, options);
    case "getByText":
      return page.getByText(locator.value, options);
    case "css":
      return page.locator(locator.value);
  }
}

/** Phân giải 1 Locator Registry trên `page`. Không throw — 0/>1 kết quả trả về LOCATOR_BROKEN reason. */
export async function resolveLocator(page: Page, locator: RegistryLocator): Promise<ResolveResult> {
  const handle = buildLocator(page, locator);
  const count = await handle.count();

  if (count === 0) return { ok: false, reason: "NOT_FOUND", count };
  if (count > 1) return { ok: false, reason: "AMBIGUOUS", count };
  return { ok: true, handle };
}
