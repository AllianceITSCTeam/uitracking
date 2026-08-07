import { join } from "node:path";
import { getAuthenticatedContext, getBrowser, closeBrowser, resolveLocator } from "capture";
import { buildProjectDir, loadLocatorsFile, loadProjectsFile, loadScreensConfig } from "core/node";

const LOW_PRIORITY_STRATEGIES = new Set(["getByText", "css"]);

/** Chạy `validate-locators` cho 1 project: resolve toàn bộ registry, in OK/NOT_FOUND/AMBIGUOUS. Trả exit code. */
export async function runValidateLocators(projectId: string, workspaceRoot: string): Promise<number> {
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
  const screensConfig = screensResult.data;
  const projectDir = buildProjectDir(workspaceRoot, projectId);

  const browser = await getBrowser();
  let hasIssue = false;

  try {
    const context = screensConfig.auth
      ? await getAuthenticatedContext(
          browser,
          screensConfig.auth,
          screensConfig.baseUrl,
          join(projectDir, ".auth", "storageState.json"),
        )
      : await browser.newContext();

    try {
      for (const screen of screensConfig.screens) {
        const locatorsPath = join(projectDir, "locators", `${screen.id}.locators.yaml`);
        const locatorsResult = loadLocatorsFile(locatorsPath);
        if (!locatorsResult.ok) {
          for (const error of locatorsResult.errors) {
            console.error(`${error.file}: ${error.field} — ${error.message}`);
          }
          hasIssue = true;
          continue;
        }

        const page = await context.newPage();
        await page.goto(new URL(screen.url, screensConfig.baseUrl).toString());
        if (screen.waitFor) await page.waitForSelector(screen.waitFor);

        for (const control of locatorsResult.data.controls) {
          const resolved = await resolveLocator(page, control.locator);
          if (resolved.ok) {
            console.log(`[${screen.id}] ${control.key}: OK`);
            if (LOW_PRIORITY_STRATEGIES.has(control.locator.strategy)) {
              console.warn(
                `[${screen.id}] ${control.key}: warning — low-priority strategy "${control.locator.strategy}"`,
              );
            }
          } else {
            console.log(`[${screen.id}] ${control.key}: ${resolved.reason} (count=${resolved.count})`);
            hasIssue = true;
          }
        }

        await page.close();
      }
    } finally {
      await context.close();
    }
  } finally {
    await closeBrowser();
  }

  return hasIssue ? 1 : 0;
}
