#!/usr/bin/env node
import { Command } from "commander";
import { runTrackRun } from "./run.js";
import { runValidateLocators } from "./validate-locators.js";
import { runRecord } from "./record.js";

const program = new Command();
program.name("debqc").description("DEBQC UI Tracking Tool CLI");

program
  .command("validate-locators")
  .requiredOption("--project <id>", "project id from workspace/projects.yaml")
  .option("--workspace <path>", "path to workspace root", "workspace")
  .action(async (options: { project: string; workspace: string }) => {
    const exitCode = await runValidateLocators(options.project, options.workspace);
    process.exitCode = exitCode;
  });

program
  .command("record")
  .requiredOption("--project <id>", "project id from workspace/projects.yaml")
  .requiredOption("--screen <id>", "screen id from screens.config.yaml")
  .option("--workspace <path>", "path to workspace root", "workspace")
  .action(async (options: { project: string; screen: string; workspace: string }) => {
    const exitCode = await runRecord(options.project, options.screen, options.workspace);
    process.exitCode = exitCode;
  });

const track = program.command("track").description("Capture → diff → report pipeline");

track
  .command("run")
  .option("--project <id>", "project id from workspace/projects.yaml")
  .option("--all", "run for every project in workspace/projects.yaml")
  .option("--workspace <path>", "path to workspace root", "workspace")
  .action(async (options: { project?: string; all?: boolean; workspace: string }) => {
    const exitCode = await runTrackRun({ project: options.project, all: options.all }, options.workspace);
    process.exitCode = exitCode;
  });

await program.parseAsync(process.argv);
