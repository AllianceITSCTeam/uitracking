import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { chromium } from "playwright";
import type { Locator as RegistryLocator } from "core";
import { loadProjectsFile, loadScreensConfig } from "core/node";
import { startRecorderSession } from "recorder";

/** Chạy `record`: mở trình duyệt headed, click control → đề xuất locator, hỏi key, nối vào registry. Trả exit code. */
export async function runRecord(projectId: string, screenId: string, workspaceRoot: string): Promise<number> {
  const projectsResult = loadProjectsFile(join(workspaceRoot, "projects.yaml"));
  if (!projectsResult.ok) {
    for (const error of projectsResult.errors) {
      console.error(`${error.file}: ${error.field} — ${error.message}`);
    }
    return 1;
  }

  const project = projectsResult.data.projects.find((entry) => entry.id === projectId);
  if (!project) {
    console.error(`Project "${projectId}" not found in ${join(workspaceRoot, "projects.yaml")}`);
    return 1;
  }

  const screensConfigPath = join(workspaceRoot, project.config);
  const screensResult = loadScreensConfig(screensConfigPath);
  if (!screensResult.ok) {
    for (const error of screensResult.errors) {
      console.error(`${error.file}: ${error.field} — ${error.message}`);
    }
    return 1;
  }

  const screen = screensResult.data.screens.find((entry) => entry.id === screenId);
  if (!screen) {
    console.error(`Screen "${screenId}" not found in ${screensConfigPath}`);
    return 1;
  }

  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage();
    await page.goto(new URL(screen.url, screensResult.data.baseUrl).toString());
    if (screen.waitFor) await page.waitForSelector(screen.waitFor);

    const rl = createInterface({ input: stdin, output: stdout });
    try {
      await startRecorderSession(
        page,
        workspaceRoot,
        projectId,
        screenId,
        async (suggested: RegistryLocator) => {
          console.log(`Đề xuất locator: ${suggested.strategy} = ${suggested.value}`);
          const key = (await rl.question("Key cho control này (Enter để bỏ qua): ")).trim();
          return key || null;
        },
        (entry) => console.log(`Đã ghi "${entry.key}" vào ${screenId}.locators.yaml`),
        (error) => console.error(`Không thể ghi locator: ${error.message}`),
      );

      console.log("Recorder đang chạy — click vào control trong cửa sổ trình duyệt. Đóng cửa sổ để kết thúc.");
      await new Promise<void>((resolve) => {
        page.once("close", () => resolve());
      });
    } finally {
      rl.close();
    }
  } finally {
    if (browser.isConnected()) await browser.close();
  }

  return 0;
}
