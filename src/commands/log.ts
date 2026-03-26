import type { Command } from "commander";
import { getDb } from "../storage/db";
import { listSearches } from "../storage/queries";
import { formatSearchTable, formatJson, parseSince } from "../utils/format";

export function registerLogCommand(program: Command): void {
  program
    .command("log")
    .description("List recent searches")
    .option("-l, --limit <number>", "Number of results", "20")
    .option("-t, --type <type>", "Filter by type (search|fetch)")
    .option("-p, --project <dir>", "Filter by project directory")
    .option("-s, --since <duration>", "Filter by time (e.g., 7d, 24h)")
    .option("-a, --assistant <name>", "Filter by assistant")
    .option("--json", "Output as JSON")
    .action((opts) => {
      const db = getDb();
      const filters = {
        limit: parseInt(opts.limit, 10),
        type: opts.type,
        project: opts.project === "." ? process.cwd() : opts.project,
        since: opts.since ? parseSince(opts.since) : undefined,
        assistant: opts.assistant,
      };

      const results = listSearches(db, filters);

      if (opts.json) {
        console.log(formatJson(results));
      } else {
        console.log(formatSearchTable(results));
      }
    });
}
