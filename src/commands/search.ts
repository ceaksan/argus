import type { Command } from "commander";
import { getDb } from "../storage/db";
import { searchInLogs } from "../storage/queries";
import { formatSearchTable, formatJson } from "../utils/format";

export function registerSearchCommand(program: Command): void {
  program
    .command("search <keyword>")
    .description("Search within logged queries and results")
    .option("-l, --limit <number>", "Number of results", "20")
    .option("--json", "Output as JSON")
    .action((keyword, opts) => {
      const db = getDb();
      const results = searchInLogs(db, keyword, parseInt(opts.limit, 10));

      if (opts.json) {
        console.log(formatJson(results));
      } else {
        console.log(formatSearchTable(results));
      }
    });
}
