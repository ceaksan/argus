import { describe, it, expect } from "vitest";
import { tokenize, jaccardSimilarity, clusterQueries } from "../../src/analysis/cluster";

describe("tokenize", () => {
  it("lowercases and splits on whitespace", () => {
    expect(tokenize("Astro Middleware")).toEqual(new Set(["astro", "middleware"]));
  });

  it("removes common stop words", () => {
    expect(tokenize("how to use the astro middleware in a project")).toEqual(
      new Set(["astro", "middleware", "project"])
    );
  });

  it("removes year-like tokens (2024, 2025, 2026)", () => {
    expect(tokenize("cloudflare workers 2025 2026")).toEqual(
      new Set(["cloudflare", "workers"])
    );
  });

  it("removes quoted OR operators and special chars", () => {
    expect(tokenize('"does not work" OR "cannot"')).toEqual(
      new Set(["does", "work", "cannot"])
    );
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const a = new Set(["astro", "middleware"]);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const a = new Set(["astro"]);
    const b = new Set(["django"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("returns correct value for overlapping sets", () => {
    const a = new Set(["astro", "middleware", "redirect"]);
    const b = new Set(["astro", "middleware", "cloudflare"]);
    // intersection: 2, union: 4 => 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe("clusterQueries", () => {
  it("groups similar queries into one cluster", () => {
    const queries = [
      "astro middleware redirect map",
      "astro middleware static pages",
      "astro middleware prerendered pages",
      "django orm query optimization",
    ];
    const clusters = clusterQueries(queries, 0.4);
    expect(clusters.length).toBe(2);

    const astroClusters = clusters.filter((c) =>
      c.representative.includes("astro")
    );
    expect(astroClusters).toHaveLength(1);
    expect(astroClusters[0].queries.length).toBe(3);
  });

  it("uses longest query as representative", () => {
    const queries = ["astro middleware", "astro middleware redirect static pages"];
    const clusters = clusterQueries(queries, 0.4);
    expect(clusters[0].representative).toBe("astro middleware redirect static pages");
  });

  it("returns single-element clusters for unique queries", () => {
    const queries = ["react hooks", "django models"];
    const clusters = clusterQueries(queries, 0.6);
    expect(clusters.length).toBe(2);
    expect(clusters[0].queries.length).toBe(1);
  });
});
