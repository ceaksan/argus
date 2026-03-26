import { describe, it, expect } from "vitest";
import {
  computeGaps,
  computeMissedConnections,
  computeContentSignals,
  computeSessionEfficiency,
} from "../../src/analysis/signals";
import type {
  QueryCluster,
  BridgeResult,
} from "../../src/analysis/types";

type TestRecord = {
  session_id: string;
  type: string;
  query: string;
};

describe("computeGaps", () => {
  it("marks queries with no bridge matches as gaps", () => {
    const clusters: QueryCluster[] = [
      { representative: "v8 snapshot startup", queries: ["v8 snapshot startup"], sessions: new Set(["s1"]), count: 1 },
    ];
    const bridgeResults: BridgeResult[] = [
      { query: "v8 snapshot startup", matches: [], available: true },
    ];

    const gaps = computeGaps(clusters, bridgeResults);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].query).toBe("v8 snapshot startup");
    expect(gaps[0].bestScore).toBe(0);
  });

  it("marks queries with low scores as gaps", () => {
    const clusters: QueryCluster[] = [
      { representative: "map memory footprint", queries: ["map memory footprint"], sessions: new Set(["s1"]), count: 1 },
    ];
    const bridgeResults: BridgeResult[] = [
      {
        query: "map memory footprint",
        matches: [{ filePath: "/f.md", projectId: "p", score: 0.12, snippet: "" }],
        available: true,
      },
    ];

    const gaps = computeGaps(clusters, bridgeResults);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].bestScore).toBe(0.12);
  });

  it("does not include high-score matches as gaps", () => {
    const clusters: QueryCluster[] = [
      { representative: "astro routing", queries: ["astro routing"], sessions: new Set(["s1"]), count: 1 },
    ];
    const bridgeResults: BridgeResult[] = [
      {
        query: "astro routing",
        matches: [{ filePath: "/f.md", projectId: "p", score: 0.85, snippet: "" }],
        available: true,
      },
    ];

    const gaps = computeGaps(clusters, bridgeResults);
    expect(gaps).toHaveLength(0);
  });
});

describe("computeMissedConnections", () => {
  it("returns high-score matches as missed connections", () => {
    const clusters: QueryCluster[] = [
      { representative: "astro aliases", queries: ["astro aliases"], sessions: new Set(["s1"]), count: 1 },
    ];
    const bridgeResults: BridgeResult[] = [
      {
        query: "astro aliases",
        matches: [{ filePath: "/docs/routing.md", projectId: "ceaksan-v4.0", score: 0.82, snippet: "Aliases" }],
        available: true,
      },
    ];

    const missed = computeMissedConnections(clusters, bridgeResults);
    expect(missed).toHaveLength(1);
    expect(missed[0].match.score).toBe(0.82);
  });

  it("ignores low-score matches", () => {
    const clusters: QueryCluster[] = [
      { representative: "react hooks", queries: ["react hooks"], sessions: new Set(["s1"]), count: 1 },
    ];
    const bridgeResults: BridgeResult[] = [
      {
        query: "react hooks",
        matches: [{ filePath: "/f.md", projectId: "p", score: 0.25, snippet: "" }],
        available: true,
      },
    ];

    const missed = computeMissedConnections(clusters, bridgeResults);
    expect(missed).toHaveLength(0);
  });
});

describe("computeContentSignals", () => {
  it("flags clusters with 3+ queries as content signals", () => {
    const clusters: QueryCluster[] = [
      {
        representative: "astro cloudflare redirect middleware",
        queries: [
          "astro middleware redirect",
          "astro cloudflare workers redirect",
          "astro cloudflare adapter redirect",
        ],
        sessions: new Set(["s1"]),
        count: 3,
      },
    ];

    const records: TestRecord[] = [
      { session_id: "s1", type: "search", query: "astro middleware redirect" },
      { session_id: "s1", type: "search", query: "astro cloudflare workers redirect" },
      { session_id: "s1", type: "fetch", query: "https://docs.astro.build/routing" },
      { session_id: "s1", type: "fetch", query: "https://docs.astro.build/routing" },
      { session_id: "s1", type: "search", query: "astro cloudflare adapter redirect" },
    ];

    const signals = computeContentSignals(clusters, records);
    expect(signals).toHaveLength(1);
    expect(signals[0].uniqueAngles).toBe(3);
    expect(signals[0].repeatedFetches).toBeGreaterThan(0);
  });

  it("skips clusters with fewer than 3 queries", () => {
    const clusters: QueryCluster[] = [
      { representative: "react hooks", queries: ["react hooks", "react custom hooks"], sessions: new Set(["s1"]), count: 2 },
    ];

    const signals = computeContentSignals(clusters, []);
    expect(signals).toHaveLength(0);
  });
});

describe("computeSessionEfficiency", () => {
  it("scores a focused session highly", () => {
    const records: TestRecord[] = [
      { session_id: "s1", type: "search", query: "react hooks" },
      { session_id: "s1", type: "fetch", query: "https://react.dev" },
    ];

    const efficiency = computeSessionEfficiency(records);
    expect(efficiency).toHaveLength(1);
    expect(efficiency[0].score).toBeGreaterThan(80);
  });

  it("scores a rabbit hole session lower", () => {
    const queries = Array.from({ length: 15 }, (_, i) => ({
      session_id: "s1",
      type: "search",
      query: `search query ${i}`,
    }));
    // Add duplicate fetches
    queries.push(
      { session_id: "s1", type: "fetch", query: "https://example.com" },
      { session_id: "s1", type: "fetch", query: "https://example.com" },
      { session_id: "s1", type: "search", query: "search query 0" },
    );

    const efficiency = computeSessionEfficiency(queries);
    expect(efficiency).toHaveLength(1);
    expect(efficiency[0].score).toBeLessThan(70);
    expect(efficiency[0].repeatCount).toBeGreaterThan(0);
  });

  it("handles multiple sessions independently", () => {
    const records: TestRecord[] = [
      { session_id: "s1", type: "search", query: "query a" },
      { session_id: "s2", type: "search", query: "query b" },
    ];

    const efficiency = computeSessionEfficiency(records);
    expect(efficiency).toHaveLength(2);
  });
});
