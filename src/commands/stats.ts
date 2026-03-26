import type { Command } from "commander";
import { getDb } from "../storage/db";
import { getStats } from "../storage/queries";
import { formatStatsOutput, formatJson, parseSince } from "../utils/format";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats")
    .description("Show search statistics")
    .option("-s, --since <duration>", "Filter by time (e.g., 30d)")
    .option("--json", "Output as JSON")
    .action((opts) => {
      const db = getDb();
      const since = opts.since ? parseSince(opts.since) : undefined;
      const stats = getStats(db, since);

      if (opts.json) {
        console.log(formatJson(stats));
      } else {
        console.log(formatStatsOutput(stats));
      }
    });
}
