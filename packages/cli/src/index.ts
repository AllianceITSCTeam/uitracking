#!/usr/bin/env node
import { Command } from "commander";
import { runValidateLocators } from "./validate-locators.js";

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

await program.parseAsync(process.argv);
