import type { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import TOML from "@iarna/toml";

const CLAUDE_SETTINGS = path.join(process.env.HOME || "", ".claude", "settings.json");
const KIMI_CONFIG = path.join(process.env.HOME || "", ".kimi", "config.toml");
const OPENCODE_PLUGIN_DIR = path.join(process.env.HOME || "", ".config", "opencode", "plugins");
const OPENCODE_PLUGIN_NAME = "opencode-argus.js";

const CLAUDE_HOOKS = {
  PreToolUse: [
    {
      matcher: "WebSearch|WebFetch",
      hooks: [{ type: "command", command: "argus capture pre" }],
    },
  ],
  PostToolUse: [
    {
      matcher: "WebSearch|WebFetch",
      hooks: [{ type: "command", command: "argus capture post" }],
    },
  ],
};

interface KimiHook {
  event: string;
  matcher: string;
  command: string;
  timeout?: number;
}

const KIMI_HOOKS: KimiHook[] = [
  {
    event: "PreToolUse",
    matcher: "SearchWeb|FetchURL",
    command: "argus capture pre --assistant kimi-code",
  },
  {
    event: "PostToolUse",
    matcher: "SearchWeb|FetchURL",
    command: "argus capture post --assistant kimi-code",
  },
];

function readJson(p: string): any {
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function writeJson(p: string, data: any): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function installClaude(): void {
  const settings = readJson(CLAUDE_SETTINGS);
  if (!settings.hooks) settings.hooks = {};

  for (const [event, hookConfigs] of Object.entries(CLAUDE_HOOKS)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    const existing = settings.hooks[event] as any[];
    const alreadyInstalled = existing.some(
      (h: any) =>
        h.matcher === "WebSearch|WebFetch" &&
        h.hooks?.some((hh: any) => hh.command?.startsWith("argus capture")),
    );
    if (!alreadyInstalled) {
      settings.hooks[event].push(...hookConfigs);
    }
  }

  writeJson(CLAUDE_SETTINGS, settings);
  console.log(chalk.green("Claude Code hooks installed."));
  console.log(`  ${CLAUDE_SETTINGS}`);
}

function uninstallClaude(): void {
  const settings = readJson(CLAUDE_SETTINGS);
  if (!settings.hooks) return;
  for (const event of ["PreToolUse", "PostToolUse"]) {
    if (!settings.hooks[event]) continue;
    settings.hooks[event] = (settings.hooks[event] as any[]).filter(
      (h: any) =>
        !(
          h.matcher === "WebSearch|WebFetch" &&
          h.hooks?.some((hh: any) => hh.command?.startsWith("argus capture"))
        ),
    );
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  writeJson(CLAUDE_SETTINGS, settings);
  console.log(chalk.green("Claude Code hooks removed."));
}

function claudeStatus(): { pre: boolean; post: boolean } {
  const settings = readJson(CLAUDE_SETTINGS);
  const hooks = settings.hooks || {};
  const check = (arr: any[]) =>
    (arr || []).some(
      (h: any) =>
        h.matcher === "WebSearch|WebFetch" &&
        h.hooks?.some((hh: any) => hh.command?.startsWith("argus capture")),
    );
  return { pre: check(hooks.PreToolUse), post: check(hooks.PostToolUse) };
}

function readToml(p: string): any {
  if (!fs.existsSync(p)) return {};
  return TOML.parse(fs.readFileSync(p, "utf-8"));
}

function writeToml(p: string, data: any): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, TOML.stringify(data));
}

function isArgusKimiHook(h: KimiHook): boolean {
  return typeof h?.command === "string" && h.command.startsWith("argus capture");
}

function installKimi(): void {
  const config = readToml(KIMI_CONFIG);
  const hooks: KimiHook[] = Array.isArray(config.hooks) ? config.hooks : [];
  const cleaned = hooks.filter((h) => !isArgusKimiHook(h));
  cleaned.push(...KIMI_HOOKS);
  config.hooks = cleaned;
  writeToml(KIMI_CONFIG, config);
  console.log(chalk.green("Kimi CLI hooks installed."));
  console.log(`  ${KIMI_CONFIG}`);
}

function uninstallKimi(): void {
  const config = readToml(KIMI_CONFIG);
  if (!Array.isArray(config.hooks)) return;
  config.hooks = config.hooks.filter((h: KimiHook) => !isArgusKimiHook(h));
  writeToml(KIMI_CONFIG, config);
  console.log(chalk.green("Kimi CLI hooks removed."));
}

function kimiStatus(): { pre: boolean; post: boolean } {
  const config = readToml(KIMI_CONFIG);
  const hooks: KimiHook[] = Array.isArray(config.hooks) ? config.hooks : [];
  return {
    pre: hooks.some((h) => h.event === "PreToolUse" && isArgusKimiHook(h)),
    post: hooks.some((h) => h.event === "PostToolUse" && isArgusKimiHook(h)),
  };
}

function pluginSourcePath(): string {
  // dist/commands/hook.js -> repo root -> plugins/
  return path.resolve(__dirname, "..", "..", "plugins", OPENCODE_PLUGIN_NAME);
}

function installOpenCode(): void {
  const src = pluginSourcePath();
  if (!fs.existsSync(src)) {
    console.log(chalk.red(`Plugin source not found at ${src}`));
    return;
  }
  fs.mkdirSync(OPENCODE_PLUGIN_DIR, { recursive: true });
  const dest = path.join(OPENCODE_PLUGIN_DIR, OPENCODE_PLUGIN_NAME);
  if (fs.existsSync(dest) || fs.lstatSync(dest).isSymbolicLink?.()) {
    try { fs.unlinkSync(dest); } catch {}
  }
  fs.symlinkSync(src, dest);
  console.log(chalk.green("OpenCode plugin installed."));
  console.log(`  ${dest} -> ${src}`);
}

function uninstallOpenCode(): void {
  const dest = path.join(OPENCODE_PLUGIN_DIR, OPENCODE_PLUGIN_NAME);
  if (fs.existsSync(dest) || fs.lstatSync(dest).isSymbolicLink?.()) {
    try { fs.unlinkSync(dest); } catch {}
    console.log(chalk.green("OpenCode plugin removed."));
  } else {
    console.log(chalk.yellow("OpenCode plugin not installed."));
  }
}

function opencodeStatus(): { installed: boolean } {
  const dest = path.join(OPENCODE_PLUGIN_DIR, OPENCODE_PLUGIN_NAME);
  try {
    return { installed: fs.existsSync(dest) || fs.lstatSync(dest).isSymbolicLink() };
  } catch {
    return { installed: false };
  }
}

type Target = "all" | "claude" | "kimi" | "opencode";

function resolveTarget(opts: { claude?: boolean; kimi?: boolean; opencode?: boolean }): Target {
  const flags = [opts.claude, opts.kimi, opts.opencode].filter(Boolean).length;
  if (flags === 1) {
    if (opts.claude) return "claude";
    if (opts.kimi) return "kimi";
    if (opts.opencode) return "opencode";
  }
  return "all";
}

export function registerHookCommand(program: Command): void {
  const hook = program.command("hook").description("Manage assistant hooks");

  hook
    .command("install")
    .description("Install Argus hooks into assistant configs")
    .option("--claude", "Only Claude Code")
    .option("--kimi", "Only Kimi CLI")
    .option("--opencode", "Only OpenCode")
    .action((opts) => {
      const target = resolveTarget(opts);
      if (target === "all" || target === "claude") installClaude();
      if (target === "all" || target === "kimi") installKimi();
      if (target === "all" || target === "opencode") installOpenCode();
    });

  hook
    .command("uninstall")
    .description("Remove Argus hooks from assistant configs")
    .option("--claude", "Only Claude Code")
    .option("--kimi", "Only Kimi CLI")
    .option("--opencode", "Only OpenCode")
    .action((opts) => {
      const target = resolveTarget(opts);
      if (target === "all" || target === "claude") uninstallClaude();
      if (target === "all" || target === "kimi") uninstallKimi();
      if (target === "all" || target === "opencode") uninstallOpenCode();
    });

  hook
    .command("status")
    .description("Check if Argus hooks are installed")
    .action(() => {
      const c = claudeStatus();
      const k = kimiStatus();
      const o = opencodeStatus();
      const fmt = (ok: boolean) => (ok ? chalk.green("installed") : chalk.red("not installed"));
      console.log(chalk.bold("Claude Code"));
      console.log(`  PreToolUse:  ${fmt(c.pre)}`);
      console.log(`  PostToolUse: ${fmt(c.post)}`);
      console.log(chalk.bold("\nKimi CLI"));
      console.log(`  PreToolUse:  ${fmt(k.pre)}`);
      console.log(`  PostToolUse: ${fmt(k.post)}`);
      console.log(chalk.bold("\nOpenCode"));
      console.log(`  Plugin:      ${fmt(o.installed)}`);
      if (!c.pre || !c.post || !k.pre || !k.post || !o.installed) {
        console.log(`\nRun ${chalk.cyan("argus hook install")} to set up hooks.`);
      }
    });
}
