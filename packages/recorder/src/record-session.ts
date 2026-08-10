import type { RegistryControl, Locator as RegistryLocator } from "core";
import type { Page } from "playwright";
import { appendLocatorEntry } from "./append-locator.js";
import { suggestLocator } from "./suggest-locator.js";

const MARK_ATTR = "data-debqc-recorder-target";

/** Hỏi user tên `key` cho locator vừa đề xuất — trả `null` để bỏ qua control này. */
export type PromptKey = (suggested: RegistryLocator) => Promise<string | null>;

/** Gắn click-listener vào `page`: mỗi click đề xuất locator theo bất biến số 1, hỏi `promptKey` rồi nối vào registry. */
export async function startRecorderSession(
  page: Page,
  workspaceRoot: string,
  projectId: string,
  screenId: string,
  promptKey: PromptKey,
  onEntryAppended?: (entry: RegistryControl) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  let busy = false;

  await page.exposeFunction("__debqcRecorderClick", async () => {
    if (busy) return;
    busy = true;
    try {
      const target = page.locator(`[${MARK_ATTR}]`);
      const locator = await suggestLocator(page, target);
      await target.evaluate((el, attr) => el.removeAttribute(attr), MARK_ATTR);

      const key = await promptKey(locator);
      if (!key) return;

      const entry: RegistryControl = { key, locator };
      appendLocatorEntry(workspaceRoot, projectId, screenId, entry);
      onEntryAppended?.(entry);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      busy = false;
    }
  });

  await page.evaluate((attr) => {
    document.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.target instanceof Element) {
          event.target.setAttribute(attr, "1");
          (window as unknown as { __debqcRecorderClick: () => void }).__debqcRecorderClick();
        }
      },
      { capture: true },
    );
  }, MARK_ATTR);
}
