import yaml from "js-yaml";
import { LocatorsFileSchema, type LocatorsFile } from "core";

export class LocatorsImportError extends Error {}

export function parseLocatorsImportFile(text: string): LocatorsFile {
  let parsed: unknown;
  try {
    parsed = yaml.load(text);
  } catch {
    throw new LocatorsImportError("File không phải YAML hợp lệ");
  }

  const result = LocatorsFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new LocatorsImportError(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}
