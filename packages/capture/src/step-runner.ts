import type { Page } from "playwright";

export type Step = { fill: string; value: string } | { click: string } | { waitFor: string };

/** Chạy 1 bước điều hướng (dùng chung cho `auth.steps` và `screen.scenario`). */
export async function runStep(page: Page, step: Step): Promise<void> {
  if ("fill" in step) {
    await page.fill(step.fill, step.value);
    return;
  }
  if ("click" in step) {
    await page.click(step.click);
    return;
  }
  await page.waitForSelector(step.waitFor);
}

export async function runSteps(page: Page, steps: Step[]): Promise<void> {
  for (const step of steps) {
    await runStep(page, step);
  }
}
