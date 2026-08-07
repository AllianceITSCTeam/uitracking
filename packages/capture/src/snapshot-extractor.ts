import type { Control, RegistryControl } from "core";
import type { Locator as PlaywrightLocator } from "playwright";

const STYLE_WHITELIST = [
  "color",
  "backgroundColor",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "display",
  "visibility",
  "border",
  "borderRadius",
] as const;

type ExtractedRaw = {
  tag: string;
  type: string;
  role: string;
  label: string | undefined;
  placeholder: string | undefined;
  options: string[] | null;
  style: Record<string, string>;
  attrs: Record<string, boolean>;
};

/** Trích 1 Control từ 1 element đã resolve — xem UI-TRACKING-TOOL-PLAN.md §3.2. */
export async function extractControl(
  handle: PlaywrightLocator,
  registryControl: RegistryControl,
  order: number,
): Promise<Control> {
  const raw = await handle.evaluate((el, styleWhitelist): ExtractedRaw => {
    const tag = el.tagName.toLowerCase();

    const explicitRole = el.getAttribute("role");
    let role: string;
    if (explicitRole) {
      role = explicitRole;
    } else if (tag === "input") {
      const inputType = (el as HTMLInputElement).type;
      role = inputType === "checkbox" ? "checkbox" : inputType === "radio" ? "radio" : "textbox";
    } else if (tag === "select") {
      role = "combobox";
    } else if (tag === "textarea") {
      role = "textbox";
    } else if (tag === "a") {
      role = "link";
    } else {
      role = tag;
    }

    const nativeType = (el as { type?: string }).type;
    const type = nativeType && nativeType.length > 0 ? nativeType : tag;

    const ariaLabel = el.getAttribute("aria-label")?.trim();
    let label = ariaLabel || undefined;
    if (!label && el.id) {
      const labelEl = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      label = labelEl?.textContent?.trim() || undefined;
    }
    if (!label && tag === "button") {
      label = el.textContent?.trim() || undefined;
    }

    const placeholder = el.getAttribute("placeholder")?.trim() || undefined;

    const options =
      tag === "select"
        ? Array.from(el.querySelectorAll("option")).map((option) => option.textContent?.trim() ?? "")
        : tag === "table"
          ? Array.from(el.querySelectorAll("th")).map((th) => th.textContent?.trim() ?? "")
          : null;

    const computed = getComputedStyle(el);
    const style: Record<string, string> = {};
    for (const key of styleWhitelist) {
      style[key] = computed[key as keyof CSSStyleDeclaration] as string;
    }

    const attrs = {
      required: el.hasAttribute("required"),
      disabled: el.hasAttribute("disabled"),
      readonly: el.hasAttribute("readonly"),
    };

    return { tag, type, role, label, placeholder, options, style, attrs };
  }, STYLE_WHITELIST);

  return {
    key: registryControl.key,
    role: raw.role,
    tag: raw.tag,
    type: raw.type,
    order,
    text: { label: raw.label, placeholder: raw.placeholder },
    options: raw.options,
    style: raw.style,
    attrs: raw.attrs,
  };
}
