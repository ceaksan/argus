import { describe, it, expect } from "vitest";
import { formatAnalysisReport } from "../../src/utils/format";
import type { AnalysisReport } from "../../src/analysis/types";

describe("formatAnalysisReport", () => {
  it("renders all sections when data exists", () => {
    const report: AnalysisReport = {
      period: { from: "2026-03-20", to: "2026-03-26" },
      totalQueries: 46,
      totalSessions: 2,
      bridgeAvailable: true,
      gaps: [
        { query: "v8 snapshot startup", clusterSize: 1, bestScore: 0 },
      ],
      missed: [
        {
          query: "astro aliases",
          match: { filePath: "/docs/routing.md", projectId: "ceaksan-v4.0", score: 0.82, snippet: "Aliases" },
        },
      ],
      contentSignals: [
        {
          topic: "astro cloudflare redirect",
          queries: ["q1", "q2", "q3"],
          uniqueAngles: 3,
          repeatedFetches: 2,
          sessionCount: 1,
        },
      ],
      efficiency: [
        {
          sessionId: "abca5bda-8f95-4875-abec-857d72d69e6b",
          totalQueries: 44,
          searchCount: 21,
          fetchCount: 23,
          repeatCount: 5,
          duplicateFetches: 3,
          score: 62,
        },
      ],
    };

    const output = formatAnalysisReport(report);
    expect(output).toContain("Argus Analysis Report");
    expect(output).toContain("Knowledge Gaps");
    expect(output).toContain("v8 snapshot startup");
    expect(output).toContain("Missed Connections");
    expect(output).toContain("astro aliases");
    expect(output).toContain("Content Signals");
    expect(output).toContain("astro cloudflare redirect");
    expect(output).toContain("Session Efficiency");
    expect(output).toContain("62%");
  });

  it("shows warning when bridge is unavailable", () => {
    const report: AnalysisReport = {
      period: { from: "2026-03-20", to: "2026-03-26" },
      totalQueries: 5,
      totalSessions: 1,
      bridgeAvailable: false,
      gaps: [],
      missed: [],
      contentSignals: [],
      efficiency: [
        { sessionId: "s1", totalQueries: 5, searchCount: 3, fetchCount: 2, repeatCount: 0, duplicateFetches: 0, score: 90 },
      ],
    };

    const output = formatAnalysisReport(report);
    expect(output).toContain("dnomia-knowledge not available");
    expect(output).not.toContain("Knowledge Gaps");
    expect(output).not.toContain("Missed Connections");
  });

  it("skips empty sections", () => {
    const report: AnalysisReport = {
      period: { from: "2026-03-20", to: "2026-03-26" },
      totalQueries: 2,
      totalSessions: 1,
      bridgeAvailable: true,
      gaps: [],
      missed: [],
      contentSignals: [],
      efficiency: [
        { sessionId: "s1", totalQueries: 2, searchCount: 1, fetchCount: 1, repeatCount: 0, duplicateFetches: 0, score: 95 },
      ],
    };

    const output = formatAnalysisReport(report);
    expect(output).not.toContain("Knowledge Gaps");
    expect(output).not.toContain("Content Signals");
    expect(output).toContain("Session Efficiency");
  });
});
