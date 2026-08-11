import type { AuthConfig } from "core";

export type AuthStep = AuthConfig["steps"][number];
export type AuthStepAction = "fill" | "click" | "waitFor";

export function stepAction(step: AuthStep): AuthStepAction {
  if ("fill" in step) return "fill";
  if ("click" in step) return "click";
  return "waitFor";
}

export function stepSelector(step: AuthStep): string {
  if ("fill" in step) return step.fill;
  if ("click" in step) return step.click;
  return step.waitFor;
}

export function buildStep(action: AuthStepAction, selector: string, value?: string): AuthStep {
  if (action === "fill") return { fill: selector, value: value ?? "" };
  if (action === "click") return { click: selector };
  return { waitFor: selector };
}
