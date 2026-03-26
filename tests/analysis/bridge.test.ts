import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseBridgeOutput, checkBridgeAvailable } from "../../src/analysis/bridge";

describe("parseBridgeOutput", () => {
  it("parses JSON array of search results", () => {
    const output = JSON.stringify([
      {
        file_path: "/project/docs/routing.md",
        project_id: "ceaksan-v4.0",
        score: 0.82,
        snippet: "Astro routing with aliases",
      },
      {
        file_path: "/project/src/middleware.ts",
        project_id: "ceaksan-v4.0",
        score: 0.65,
        snippet: "Middleware handler",
      },
    ]);

    const result = parseBridgeOutput(output);
    expect(result).toHaveLength(2);
    expect(result[0].filePath).toBe("/project/docs/routing.md");
    expect(result[0].projectId).toBe("ceaksan-v4.0");
    expect(result[0].score).toBe(0.82);
    expect(result[0].snippet).toBe("Astro routing with aliases");
  });

  it("returns empty array for empty JSON array", () => {
    expect(parseBridgeOutput("[]")).toEqual([]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseBridgeOutput("not json")).toEqual([]);
  });

  it("returns empty array for error output", () => {
    expect(parseBridgeOutput("[dim]No results found.[/dim]")).toEqual([]);
  });
});

describe("checkBridgeAvailable", () => {
  it("returns false for empty command path", () => {
    const result = checkBridgeAvailable("");
    expect(result).toBe(false);
  });
});
