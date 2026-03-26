import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/storage/schema";
import { insertSearch, listSearches, type SearchRecord } from "../../src/storage/queries";
import { clusterQueries } from "../../src/analysis/cluster";
import { computeContentSignals, computeSessionEfficiency } from "../../src/analysis/signals";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);

  // Simulate a rabbit hole session
  const baseTime = new Date("2026-03-26T10:00:00Z");
  const searches = [
    "astro middleware redirect map",
    "astro cloudflare workers redirect",
    "astro middleware static pages",
    "astro middleware prerendered pages",
    "astro getCollection middleware runtime",
    "cloudflare workers cold start performance",
    "cloudflare workers module size limit",
    "astro content collection aliases redirects",
  ];

  for (let i = 0; i < searches.length; i++) {
    const time = new Date(baseTime.getTime() + i * 60000);
    insertSearch(db, {
      id: `id_${i}`,
      tool_use_id: `tool_${i}`,
      session_id: "session_rabbit",
      assistant: "claude-code",
      type: "search",
      query: searches[i],
      timestamp: time.toISOString(),
      project_dir: "/test/project",
    });
  }

  // Add some fetches (with duplicates)
  const fetches = [
    "https://docs.astro.build/routing",
    "https://docs.astro.build/routing",
    "https://developers.cloudflare.com/workers/limits",
  ];
  for (let i = 0; i < fetches.length; i++) {
    const time = new Date(baseTime.getTime() + (searches.length + i) * 60000);
    insertSearch(db, {
      id: `fetch_${i}`,
      tool_use_id: `ftool_${i}`,
      session_id: "session_rabbit",
      assistant: "claude-code",
      type: "fetch",
      query: fetches[i],
      timestamp: time.toISOString(),
      project_dir: "/test/project",
    });
  }

  // Add a focused session
  insertSearch(db, {
    id: "focused_1",
    tool_use_id: "ftool_focused_1",
    session_id: "session_focused",
    assistant: "claude-code",
    type: "search",
    query: "django orm optimization",
    timestamp: "2026-03-26T11:00:00Z",
    project_dir: "/test/other",
  });
});

afterEach(() => {
  db.close();
});

describe("analyze integration", () => {
  it("clusters related search queries", () => {
    const records = listSearches(db, { limit: 100 });
    const searchQueries = records
      .filter((r) => r.type === "search")
      .map((r) => r.query);

    const clusters = clusterQueries(searchQueries, 0.4);

    // Astro middleware queries should cluster together
    const astroClusters = clusters.filter(
      (c) => c.representative.includes("astro") && c.count > 1
    );
    expect(astroClusters.length).toBeGreaterThan(0);

    // Django query should be separate
    const djangoClusters = clusters.filter((c) =>
      c.representative.includes("django")
    );
    expect(djangoClusters).toHaveLength(1);
    expect(djangoClusters[0].count).toBe(1);
  });

  it("detects content signals from query clusters", () => {
    const records = listSearches(db, { limit: 100 });
    const searchQueries = records
      .filter((r) => r.type === "search")
      .map((r) => r.query);

    const clusters = clusterQueries(searchQueries, 0.4);
    const minimalRecords = records.map((r) => ({
      session_id: r.session_id,
      type: r.type,
      query: r.query,
    }));

    const signals = computeContentSignals(clusters, minimalRecords);
    // At least one cluster should be flagged as content signal (3+ queries)
    expect(signals.length).toBeGreaterThan(0);
  });

  it("computes different efficiency scores for rabbit vs focused sessions", () => {
    const records = listSearches(db, { limit: 100 });
    const minimalRecords = records.map((r) => ({
      session_id: r.session_id,
      type: r.type,
      query: r.query,
    }));

    const efficiency = computeSessionEfficiency(minimalRecords);
    expect(efficiency).toHaveLength(2);

    const rabbit = efficiency.find((e) => e.sessionId === "session_rabbit")!;
    const focused = efficiency.find((e) => e.sessionId === "session_focused")!;

    expect(focused.score).toBeGreaterThan(rabbit.score);
  });
});
