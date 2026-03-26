import type { Command } from "commander";
import { getDb } from "../storage/db";
import { listSearches } from "../storage/queries";
import { clusterQueries } from "../analysis/cluster";
import { checkBridgeAvailable, queryBridge } from "../analysis/bridge";
import { computeGaps, computeMissedConnections, computeContentSignals, computeSessionEfficiency } from "../analysis/signals";
import { formatAnalysisReport, formatJson, parseSince } from "../utils/format";
import type { AnalysisReport, BridgeResult } from "../analysis/types";

type SignalFilter = "gaps" | "missed" | "content" | "efficiency";

export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze")
    .description("Analyze search patterns and knowledge gaps")
    .option("-s, --since <duration>", "Time range (e.g., 7d, 30d)", "7d")
    .option("-p, --project <dir>", "Filter by project directory")
    .option("--signal <type>", "Show specific signal (gaps|missed|content|efficiency)")
    .option("--skip-semantic", "Skip dnomia-knowledge bridge (fast, local only)")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const db = getDb();
      const since = parseSince(opts.since);

      // 1. Fetch all search records
      const records = listSearches(db, {
        limit: 10000,
        project: opts.project === "." ? process.cwd() : opts.project,
        since,
      });

      if (records.length === 0) {
        console.log("No searches found in the specified period.");
        return;
      }

      // 2. Extract search-only queries for clustering
      const searchQueries = records
        .filter((r) => r.type === "search")
        .map((r) => r.query);

      const clusters = clusterQueries(searchQueries);

      // Enrich clusters with session info
      for (const cluster of clusters) {
        for (const record of records) {
          if (cluster.queries.includes(record.query)) {
            cluster.sessions.add(record.session_id);
          }
        }
      }

      // 3. Bridge to dnomia-knowledge (unless skipped)
      let bridgeAvailable = false;
      let bridgeResults: BridgeResult[] = [];
      const signalFilter = opts.signal as SignalFilter | undefined;

      if (!opts.skipSemantic && signalFilter !== "efficiency" && signalFilter !== "content") {
        bridgeAvailable = checkBridgeAvailable();
        if (bridgeAvailable) {
          for (const cluster of clusters) {
            const result = queryBridge(cluster.representative);
            bridgeResults.push(result);
          }
        }
      }

      // 4. Compute signals
      const minimalRecords = records.map((r) => ({
        session_id: r.session_id,
        type: r.type,
        query: r.query,
      }));

      const gaps = bridgeAvailable ? computeGaps(clusters, bridgeResults) : [];
      const missed = bridgeAvailable ? computeMissedConnections(clusters, bridgeResults) : [];
      const contentSignals = computeContentSignals(clusters, minimalRecords);
      const efficiency = computeSessionEfficiency(minimalRecords);

      // 5. Build report
      const timestamps = records.map((r) => r.timestamp).sort();
      const report: AnalysisReport = {
        period: {
          from: timestamps[0].substring(0, 10),
          to: timestamps[timestamps.length - 1].substring(0, 10),
        },
        totalQueries: records.length,
        totalSessions: new Set(records.map((r) => r.session_id)).size,
        bridgeAvailable,
        gaps: !signalFilter || signalFilter === "gaps" ? gaps : [],
        missed: !signalFilter || signalFilter === "missed" ? missed : [],
        contentSignals: !signalFilter || signalFilter === "content" ? contentSignals : [],
        efficiency: !signalFilter || signalFilter === "efficiency" ? efficiency : [],
      };

      // 6. Output
      if (opts.json) {
        console.log(formatJson(report));
      } else {
        console.log(formatAnalysisReport(report));
      }
    });
}
