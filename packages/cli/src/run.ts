import { join } from "node:path";
import { closeBrowser, getAuthenticatedContext, getBrowser, captureScreen } from "capture";
import { buildReport, type RunReport, type Screen } from "core";
import {
  buildProjectDir,
  generateRunId,
  loadLocatorsFile,
  loadProjectsFile,
  loadScreensConfig,
  readBaseline,
  writeBaseline,
  writeReport,
  writeReportHtml,
  writeSnapshot,
  appendHistoryEntry,
} from "core/node";
import { diffLocales, diffScreens } from "diff";
import { log } from "./log.js";
import { renderReportHtml } from "./render-report-html.js";

export type TrackRunOptions = { project?: string; all?: boolean };

export type CaptureRunResult = { ok: boolean; runId?: string };

/** Chạy pipeline capture→diff→report cho 1 project. Dùng bởi CLI (`track run`) và dashboard (trigger job). */
export async function runCaptureForProject(projectId: string, workspaceRoot: string): Promise<CaptureRunResult> {
  const projectsResult = loadProjectsFile(join(workspaceRoot, "projects.yaml"));
  if (!projectsResult.ok) {
    for (const error of projectsResult.errors) {
      console.error(`${error.file}: ${error.field} — ${error.message}`);
    }
    return { ok: false };
  }

  const project = projectsResult.data.projects.find((entry) => entry.id === projectId);
  if (!project) {
    console.error(`Project "${projectId}" not found in ${join(workspaceRoot, "projects.yaml")}`);
    return { ok: false };
  }

  const screensConfigPath = join(workspaceRoot, project.config);
  const screensResult = loadScreensConfig(screensConfigPath);
  if (!screensResult.ok) {
    for (const error of screensResult.errors) {
      console.error(`${error.file}: ${error.field} — ${error.message}`);
    }
    return { ok: false };
  }
  const screensConfig = screensResult.data;
  const projectDir = buildProjectDir(workspaceRoot, projectId);
  const [baseLocale] = screensConfig.locales;
  if (!baseLocale) throw new Error("screensConfig.locales must not be empty");

  const runId = generateRunId();
  const startedAt = new Date().toISOString();
  log("info", "run started", { run_id: runId, project: projectId });

  const browser = await getBrowser();
  const allRunReports: RunReport[] = [];

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
          continue;
        }

        const screensByLocale = new Map<string, Screen>();

        for (const locale of screensConfig.locales) {
          const { screen: captured, broken } = await captureScreen(
            context,
            screensConfig.baseUrl,
            screen,
            locale,
            screensConfig.localeSwitch,
            locatorsResult.data.controls,
          );

          writeSnapshot(workspaceRoot, projectId, runId, captured);
          screensByLocale.set(locale, captured);

          const previous = readBaseline(workspaceRoot, projectId, screen.id, locale);
          const runReport = diffScreens({
            runId,
            project: projectId,
            locale,
            previous,
            current: captured,
            broken,
            ignore: screen.ignore,
          });
          allRunReports.push(runReport);

          writeBaseline(workspaceRoot, projectId, screen.id, locale, captured);
          log("info", "screen captured", {
            run_id: runId,
            project: projectId,
            screen: screen.id,
            locale,
            changes: runReport.changes.length,
          });
        }

        if (screensConfig.locales.length > 1) {
          const localeReports = diffLocales({
            runId,
            project: projectId,
            baseLocale,
            screensByLocale,
            ignore: screen.ignore,
          });
          allRunReports.push(...localeReports);
        }
      }
    } finally {
      await context.close();
    }
  } finally {
    await closeBrowser();
  }

  const finishedAt = new Date().toISOString();
  const report = buildReport(runId, projectId, startedAt, finishedAt, allRunReports);
  writeReport(workspaceRoot, projectId, runId, report);
  writeReportHtml(workspaceRoot, projectId, runId, renderReportHtml(report));
  appendHistoryEntry(workspaceRoot, projectId, { runId, capturedAt: finishedAt });

  log("info", "run finished", { run_id: runId, project: projectId, ...report.severityCounts });

  return { ok: true, runId };
}

/** Chạy pipeline capture→diff→report cho 1 project (`--project`) hoặc toàn bộ (`--all`). Trả exit code. */
export async function runTrackRun(options: TrackRunOptions, workspaceRoot: string): Promise<number> {
  if (options.project && options.all) {
    console.error("Chỉ dùng --project hoặc --all, không dùng cả hai.");
    return 1;
  }

  if (options.project) {
    const result = await runCaptureForProject(options.project, workspaceRoot);
    return result.ok ? 0 : 1;
  }

  if (options.all) {
    const projectsResult = loadProjectsFile(join(workspaceRoot, "projects.yaml"));
    if (!projectsResult.ok) {
      for (const error of projectsResult.errors) {
        console.error(`${error.file}: ${error.field} — ${error.message}`);
      }
      return 1;
    }

    let hasIssue = false;
    for (const project of projectsResult.data.projects) {
      const result = await runCaptureForProject(project.id, workspaceRoot);
      if (!result.ok) hasIssue = true;
    }
    return hasIssue ? 1 : 0;
  }

  console.error("Cần chỉ định --project <id> hoặc --all.");
  return 1;
}
