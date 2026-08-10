import type { Locator as RegistryLocator } from "core";
import { resolveLocator } from "capture";
import type { Locator as PlaywrightLocator, Page } from "playwright";

async function isUnique(page: Page, candidate: RegistryLocator): Promise<boolean> {
  const resolved = await resolveLocator(page, candidate);
  return resolved.ok;
}

async function tryTestId(page: Page, target: PlaywrightLocator): Promise<RegistryLocator | null> {
  const testId = await target.getAttribute("data-testid");
  if (!testId) return null;
  const candidate: RegistryLocator = { strategy: "getByTestId", value: testId };
  return (await isUnique(page, candidate)) ? candidate : null;
}

/** Suy ra role ngầm định + tên hiển thị cho vài tag phổ biến — không tính toán full accessibility tree. */
async function computeImplicitRole(target: PlaywrightLocator): Promise<{ role: string; name: string } | null> {
  return target.evaluate((el) => {
    const tag = el.tagName.toLowerCase();
    const ariaLabel = el.getAttribute("aria-label")?.trim();
    if (tag === "button" || (tag === "input" && (el as HTMLInputElement).type === "submit") || (tag === "input" && (el as HTMLInputElement).type === "button")) {
      const name = ariaLabel || (el as HTMLInputElement).value?.trim() || el.textContent?.trim() || "";
      return name ? { role: "button", name } : null;
    }
    if (tag === "a" && el.hasAttribute("href")) {
      const name = ariaLabel || el.textContent?.trim() || "";
      return name ? { role: "link", name } : null;
    }
    if (tag === "input" && (el as HTMLInputElement).type === "checkbox") {
      const name = ariaLabel || "";
      return name ? { role: "checkbox", name } : null;
    }
    return null;
  });
}

async function tryRole(page: Page, target: PlaywrightLocator): Promise<RegistryLocator | null> {
  const inferred = await computeImplicitRole(target);
  if (!inferred) return null;
  const candidate: RegistryLocator = {
    strategy: "getByRole",
    value: inferred.role,
    options: { name: inferred.name },
  };
  return (await isUnique(page, candidate)) ? candidate : null;
}

async function computeLabelText(target: PlaywrightLocator): Promise<string | null> {
  return target.evaluate((el) => {
    const id = el.getAttribute("id");
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      const text = label?.textContent?.trim();
      if (text) return text;
    }
    const closest = el.closest("label");
    const text = closest?.textContent?.trim();
    return text || null;
  });
}

async function tryLabel(page: Page, target: PlaywrightLocator): Promise<RegistryLocator | null> {
  const labelText = await computeLabelText(target);
  if (!labelText) return null;
  const candidate: RegistryLocator = { strategy: "getByLabel", value: labelText };
  return (await isUnique(page, candidate)) ? candidate : null;
}

async function tryPlaceholder(page: Page, target: PlaywrightLocator): Promise<RegistryLocator | null> {
  const placeholder = await target.getAttribute("placeholder");
  if (!placeholder) return null;
  const candidate: RegistryLocator = { strategy: "getByPlaceholder", value: placeholder };
  return (await isUnique(page, candidate)) ? candidate : null;
}

async function tryText(page: Page, target: PlaywrightLocator): Promise<RegistryLocator | null> {
  const text = (await target.textContent())?.trim();
  if (!text) return null;
  const candidate: RegistryLocator = { strategy: "getByText", value: text, options: { exact: true } };
  return (await isUnique(page, candidate)) ? candidate : null;
}

/** Dựng CSS selector duy nhất bằng path từ `body` xuống (nth-of-type khi không có id) — luôn khớp đúng 1 phần tử. */
async function buildCssPath(target: PlaywrightLocator): Promise<string> {
  return target.evaluate((el) => {
    function segment(node: Element): string {
      if (node.id) return `#${CSS.escape(node.id)}`;
      const parent = node.parentElement;
      if (!parent) return node.tagName.toLowerCase();
      const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
      const index = siblings.indexOf(node) + 1;
      return `${node.tagName.toLowerCase()}:nth-of-type(${index})`;
    }
    const path: string[] = [];
    let current: Element | null = el;
    while (current && current.tagName !== "BODY") {
      path.unshift(segment(current));
      current = current.parentElement;
    }
    path.unshift("body");
    return path.join(" > ");
  });
}

/** Đề xuất Locator Registry theo đúng thứ tự ưu tiên bất biến số 1, mỗi ứng viên được xác nhận khớp duy nhất 1 phần tử. */
export async function suggestLocator(page: Page, target: PlaywrightLocator): Promise<RegistryLocator> {
  const tiers = [tryTestId, tryRole, tryLabel, tryPlaceholder, tryText];
  for (const tier of tiers) {
    const candidate = await tier(page, target);
    if (candidate) return candidate;
  }
  const cssPath = await buildCssPath(target);
  return { strategy: "css", value: cssPath };
}
