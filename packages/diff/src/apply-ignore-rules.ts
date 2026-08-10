import type { IgnoreRule } from "core";

const MASK_PLACEHOLDER = "***";

/**
 * Mask data động trước khi so sánh (T4.4). Chỉ áp biến thể `maskPattern` (regex) —
 * `selector` là việc của tầng capture, chưa có task nào implement nó.
 */
export function maskValue(value: string, ignore: IgnoreRule[] | undefined): string {
  if (!ignore) return value;

  let masked = value;
  for (const rule of ignore) {
    if ("maskPattern" in rule) {
      masked = masked.replace(new RegExp(rule.maskPattern, "g"), MASK_PLACEHOLDER);
    }
  }
  return masked;
}
