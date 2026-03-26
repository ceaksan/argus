import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/storage/schema";
import {
  insertSearch,
  updateSearchResults,
  listSearches,
  type SearchRecord,
} from "../../src/storage/queries";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe("runMigrations", () => {
  it("creates searches table with correct columns", () => {
    const columns = db
      .prepare("PRAGMA table_info(searches)")
      .all() as Array<{ name: string }>;
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("tool_use_id");
    expect(columnNames).toContain("session_id");
    expect(columnNames).toContain("assistant");
    expect(columnNames).toContain("type");
    expect(columnNames).toContain("query");
    expect(columnNames).toContain("trigger_text");
    expect(columnNames).toContain("results");
    expect(columnNames).toContain("timestamp");
    expect(columnNames).toContain("project_dir");
  });
});

describe("insertSearch", () => {
  it("inserts a search record with results NULL", () => {
    const record: SearchRecord = {
      id: "01ABC123",
      tool_use_id: "toolu_01ABC",
      session_id: "sess_123",
      assistant: "claude-code",
      type: "search",
      query: "react hooks best practices",
      timestamp: "2026-03-26T10:00:00.000Z",
      project_dir: "/Users/test/project",
    };

    insertSearch(db, record);

    const row = db.prepare("SELECT * FROM searches WHERE id = ?").get(record.id) as any;
    expect(row.query).toBe("react hooks best practices");
    expect(row.results).toBeNull();
    expect(row.tool_use_id).toBe("toolu_01ABC");
  });
});

describe("updateSearchResults", () => {
  it("updates results for existing record by tool_use_id", () => {
    const record: SearchRecord = {
      id: "01ABC123",
      tool_use_id: "toolu_01ABC",
      session_id: "sess_123",
      assistant: "claude-code",
      type: "search",
      query: "react hooks",
      timestamp: "2026-03-26T10:00:00.000Z",
      project_dir: "/Users/test/project",
    };

    insertSearch(db, record);
    const updated = updateSearchResults(db, "toolu_01ABC", '{"results": []}');

    expect(updated).toBe(true);
    const row = db.prepare("SELECT * FROM searches WHERE id = ?").get(record.id) as any;
    expect(row.results).toBe('{"results": []}');
  });

  it("returns false when tool_use_id not found", () => {
    const updated = updateSearchResults(db, "nonexistent", "{}");
    expect(updated).toBe(false);
  });
});

describe("listSearches", () => {
  it("returns searches ordered by timestamp desc", () => {
    insertSearch(db, {
      id: "01AAA",
      tool_use_id: "toolu_01",
      session_id: "sess_1",
      assistant: "claude-code",
      type: "search",
      query: "first query",
      timestamp: "2026-03-26T09:00:00.000Z",
      project_dir: "/test",
    });
    insertSearch(db, {
      id: "01BBB",
      tool_use_id: "toolu_02",
      session_id: "sess_1",
      assistant: "claude-code",
      type: "fetch",
      query: "https://example.com",
      timestamp: "2026-03-26T10:00:00.000Z",
      project_dir: "/test",
    });

    const results = listSearches(db, { limit: 10 });
    expect(results).toHaveLength(2);
    expect(results[0].query).toBe("https://example.com");
    expect(results[1].query).toBe("first query");
  });

  it("filters by type", () => {
    insertSearch(db, {
      id: "01AAA",
      tool_use_id: "toolu_01",
      session_id: "sess_1",
      assistant: "claude-code",
      type: "search",
      query: "query one",
      timestamp: "2026-03-26T09:00:00.000Z",
      project_dir: "/test",
    });
    insertSearch(db, {
      id: "01BBB",
      tool_use_id: "toolu_02",
      session_id: "sess_1",
      assistant: "claude-code",
      type: "fetch",
      query: "https://example.com",
      timestamp: "2026-03-26T10:00:00.000Z",
      project_dir: "/test",
    });

    const results = listSearches(db, { limit: 10, type: "search" });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("search");
  });
});
