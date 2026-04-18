import Table from "cli-table3";
import chalk from "chalk";
import type { SearchRecord, StatsResult } from "../storage/queries";
import type { AnalysisReport } from "../analysis/types";

export function formatSearchTable(records: SearchRecord[]): string {
  if (records.length === 0) return chalk.yellow("No searches found.");

  const table = new Table({
    head: [
      chalk.cyan("Time"),
      chalk.cyan("Type"),
      chalk.cyan("Query"),
      chalk.cyan("Project"),
      chalk.cyan("Status"),
    ],
    colWidths: [22, 8, 50, 30, 10],
    wordWrap: true,
  });

  for (const record of records) {
    const time = record.timestamp.replace("T", " ").substring(0, 19);
    const type = record.type === "search" ? chalk.green("search") : chalk.blue("fetch");
    const query =
      record.query.length > 48 ? record.query.substring(0, 45) + "..." : record.query;
    const project = record.project_dir
      ? record.project_dir.split("/").pop() || record.project_dir
      : "-";
    const status = record.results ? chalk.green("done") : chalk.yellow("pending");

    table.push([time, type, query, project, status]);
  }

  return table.toString();
}

export function formatStatsOutput(stats: StatsResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Search Statistics"));
  lines.push(`Total: ${chalk.cyan(stats.total)} (${chalk.green(stats.searches)} searches, ${chalk.blue(stats.fetches)} fetches)`);
  lines.push("");

  if (stats.topQueries.length > 0) {
    lines.push(chalk.bold("Top Queries:"));
    for (const q of stats.topQueries) {
      lines.push(`  ${chalk.cyan(q.count)}x  ${q.query}`);
    }
    lines.push("");
  }

  if (stats.byProject.length > 0) {
    lines.push(chalk.bold("By Project:"));
    for (const p of stats.byProject) {
      const name = p.project_dir ? p.project_dir.split("/").pop() || p.project_dir : "unknown";
      lines.push(`  ${chalk.cyan(p.count)}  ${name}`);
    }
  }

  return lines.join("\n");
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function parseSince(since: string): string {
  const match = since.match(/^(\d+)([dhm])$/);
  if (!match) throw new Error(`Invalid --since format: ${since}. Use Nd, Nh, or Nm (e.g., 7d, 24h, 30m)`);

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case "d":
      now.setDate(now.getDate() - amount);
      break;
    case "h":
      now.setHours(now.getHours() - amount);
      break;
    case "m":
      now.setMinutes(now.getMinutes() - amount);
      break;
  }

  return now.toISOString();
}

export function formatAnalysisReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push(chalk.bold("═══ Argus Analysis Report ═══"));
  lines.push(
    `Period: ${report.period.from} - ${report.period.to} | ` +
    `Queries: ${chalk.cyan(report.totalQueries)} | ` +
    `Sessions: ${chalk.cyan(report.totalSessions)}`
  );
  lines.push("");

  if (!report.bridgeAvailable) {
    lines.push(chalk.yellow("⚠ dnomia-knowledge not available. Showing local analysis only."));
    lines.push("");
  }

  // Knowledge Gaps
  if (report.gaps.length > 0) {
    lines.push(chalk.bold(`── Knowledge Gaps (${report.gaps.length}) ──`));
    for (const gap of report.gaps) {
      const scoreStr = gap.bestScore === 0
        ? chalk.red("no match")
        : chalk.yellow(`score: ${gap.bestScore.toFixed(2)}`);
      lines.push(`  ${gap.query}  ${scoreStr}`);
    }
    lines.push("");
  }

  // Missed Connections
  if (report.missed.length > 0) {
    lines.push(chalk.bold(`── Missed Connections (${report.missed.length}) ──`));
    for (const m of report.missed) {
      lines.push(`  ${m.query}  ${chalk.green(`score: ${m.match.score.toFixed(2)}`)}`);
      const projectName = m.match.projectId;
      const fileName = m.match.filePath.split("/").pop();
      lines.push(chalk.dim(`    → matched: ${projectName}/${fileName}`));
    }
    lines.push("");
  }

  // Content Signals
  if (report.contentSignals.length > 0) {
    lines.push(chalk.bold(`── Content Signals (${report.contentSignals.length} cluster${report.contentSignals.length > 1 ? "s" : ""}) ──`));
    for (const signal of report.contentSignals) {
      lines.push(`  "${signal.topic}" (${chalk.cyan(signal.uniqueAngles)} queries)`);
      lines.push(chalk.dim(`    depth: ${signal.uniqueAngles} unique angles, ${signal.repeatedFetches} repeated fetches`));
      const verdict = signal.uniqueAngles >= 5 ? "High-signal topic" : "Moderate-signal topic";
      lines.push(chalk.dim(`    verdict: ${verdict}, content candidate`));
    }
    lines.push("");
  }

  // Session Efficiency
  if (report.efficiency.length > 0) {
    lines.push(chalk.bold("── Session Efficiency ──"));
    for (const s of report.efficiency) {
      const shortId = s.sessionId.substring(0, 5) + "..";
      const scoreColor = s.score >= 80 ? chalk.green : s.score >= 60 ? chalk.yellow : chalk.red;
      lines.push(
        `  Session ${shortId}  │ ${s.totalQueries} queries │ ` +
        `${s.repeatCount} repeats │ ${scoreColor(`score: ${s.score}%`)}`
      );
    }
  }

  return lines.join("\n");
}
