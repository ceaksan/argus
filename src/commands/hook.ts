import type { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const SETTINGS_PATH = path.join(
  process.env.HOME || "",
  ".claude",
  "settings.json",
);

const HERMES_HOOKS = {
  PreToolUse: [
    {
      matcher: "WebSearch|WebFetch",
      hooks: [{ type: "command", command: "hermes capture pre" }],
    },
  ],
  PostToolUse: [
    {
      matcher: "WebSearch|WebFetch",
      hooks: [{ type: "command", command: "hermes capture post" }],
    },
  ],
};

function readSettings(): any {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
}

function writeSettings(settings: any): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function registerHookCommand(program: Command): void {
  const hook = program.command("hook").description("Manage Claude Code hooks");

  hook
    .command("install")
    .description("Install Hermes hooks into Claude Code settings")
    .action(() => {
      const settings = readSettings();
      if (!settings.hooks) settings.hooks = {};

      for (const [event, hookConfigs] of Object.entries(HERMES_HOOKS)) {
        if (!settings.hooks[event]) settings.hooks[event] = [];

        const existing = settings.hooks[event] as any[];
        const alreadyInstalled = existing.some(
          (h: any) =>
            h.matcher === "WebSearch|WebFetch" &&
            h.hooks?.some((hh: any) => hh.command?.startsWith("hermes capture")),
        );

        if (!alreadyInstalled) {
          settings.hooks[event].push(...hookConfigs);
        }
      }

      writeSettings(settings);
      console.log(chalk.green("Hermes hooks installed in Claude Code settings."));
      console.log(`Settings: ${SETTINGS_PATH}`);
    });

  hook
    .command("uninstall")
    .description("Remove Hermes hooks from Claude Code settings")
    .action(() => {
      const settings = readSettings();
      if (!settings.hooks) {
        console.log(chalk.yellow("No hooks found."));
        return;
      }

      for (const event of ["PreToolUse", "PostToolUse"]) {
        if (!settings.hooks[event]) continue;
        settings.hooks[event] = (settings.hooks[event] as any[]).filter(
          (h: any) =>
            !(
              h.matcher === "WebSearch|WebFetch" &&
              h.hooks?.some((hh: any) => hh.command?.startsWith("hermes capture"))
            ),
        );
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }

      if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

      writeSettings(settings);
      console.log(chalk.green("Hermes hooks removed from Claude Code settings."));
    });

  hook
    .command("status")
    .description("Check if Hermes hooks are installed")
    .action(() => {
      const settings = readSettings();
      const hooks = settings.hooks || {};

      const preInstalled = (hooks.PreToolUse || []).some(
        (h: any) =>
          h.matcher === "WebSearch|WebFetch" &&
          h.hooks?.some((hh: any) => hh.command?.startsWith("hermes capture")),
      );
      const postInstalled = (hooks.PostToolUse || []).some(
        (h: any) =>
          h.matcher === "WebSearch|WebFetch" &&
          h.hooks?.some((hh: any) => hh.command?.startsWith("hermes capture")),
      );

      console.log(`PreToolUse:  ${preInstalled ? chalk.green("installed") : chalk.red("not installed")}`);
      console.log(`PostToolUse: ${postInstalled ? chalk.green("installed") : chalk.red("not installed")}`);

      if (!preInstalled || !postInstalled) {
        console.log(`\nRun ${chalk.cyan("hermes hook install")} to set up hooks.`);
      }
    });
}
