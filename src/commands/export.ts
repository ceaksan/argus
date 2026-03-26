import type { Command } from "commander";
import { getDb } from "../storage/db";
import { listSearches } from "../storage/queries";
import { parseSince } from "../utils/format";

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("Export search logs")
    .requiredOption("-f, --format <format>", "Output format (json|csv)")
    .option("-s, --since <duration>", "Filter by time")
    .action((opts) => {
      const db = getDb();
      const since = opts.since ? parseSince(opts.since) : undefined;
      const results = listSearches(db, { limit: 100000, since });

      if (opts.format === "json") {
        console.log(JSON.stringify(results, null, 2));
      } else if (opts.format === "csv") {
        const header = "id,timestamp,type,assistant,query,project_dir,has_results";
        const rows = results.map(
          (r) =>
            `"${r.id}","${r.timestamp}","${r.type}","${r.assistant}","${r.query.replace(/"/g, '""')}","${r.project_dir || ""}","${r.results ? "yes" : "no"}"`,
        );
        console.log([header, ...rows].join("\n"));
      }
    });
}
