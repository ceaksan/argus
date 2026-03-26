#!/usr/bin/env node

import { Command } from "commander";
import { registerLogCommand } from "./commands/log";
import { registerStatsCommand } from "./commands/stats";
import { registerSearchCommand } from "./commands/search";
import { registerExportCommand } from "./commands/export";
import { registerHookCommand } from "./commands/hook";
import { handlePreToolUse } from "./hooks/pre-tool-use";
import { handlePostToolUse } from "./hooks/post-tool-use";
import { getDb, closeDb } from "./storage/db";

const program = new Command();

program
  .name("hermes")
  .description("AI CLI search logger")
  .version("0.1.0");

// Hidden capture command (called by hooks, not by users)
const capture = program.command("capture", { hidden: true }).description("Capture hook data (internal)");

capture
  .command("pre")
  .description("Handle PreToolUse hook")
  .action(async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const stdinData = Buffer.concat(chunks).toString("utf-8");
    try {
      const db = getDb();
      handlePreToolUse(stdinData, db);
      closeDb();
    } catch (err) {
      // Silent failure - never block Claude Code
      process.exit(0);
    }
  });

capture
  .command("post")
  .description("Handle PostToolUse hook")
  .action(async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const stdinData = Buffer.concat(chunks).toString("utf-8");
    try {
      const db = getDb();
      handlePostToolUse(stdinData, db);
      closeDb();
    } catch (err) {
      // Silent failure - never block Claude Code
      process.exit(0);
    }
  });

registerLogCommand(program);
registerStatsCommand(program);
registerSearchCommand(program);
registerExportCommand(program);
registerHookCommand(program);

program.parse();
