import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/storage/schema";
import { handlePostToolUse } from "../../src/hooks/post-tool-use";
import { insertSearch, type SearchRecord } from "../../src/storage/queries";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe("handlePostToolUse", () => {
  it("updates results for existing record matched by tool_use_id", () => {
    insertSearch(db, {
      id: "01ABC",
      tool_use_id: "toolu_123",
      session_id: "sess_abc",
      assistant: "claude-code",
      type: "search",
      query: "react hooks",
      timestamp: "2026-03-26T10:00:00.000Z",
      project_dir: "/test",
    });

    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/test",
      tool_name: "WebSearch",
      tool_input: { query: "react hooks" },
      tool_response: {
        results: [{ title: "React Hooks Guide", url: "https://react.dev/hooks" }],
      },
      tool_use_id: "toolu_123",
    });

    handlePostToolUse(stdin, db);

    const row = db.prepare("SELECT * FROM searches WHERE id = '01ABC'").get() as SearchRecord;
    expect(row.results).toBeTruthy();
    const parsed = JSON.parse(row.results!);
    expect(parsed.results[0].title).toBe("React Hooks Guide");
  });

  it("creates new record when no matching PreToolUse record exists", () => {
    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/test",
      tool_name: "WebSearch",
      tool_input: { query: "orphan search" },
      tool_response: { results: [] },
      tool_use_id: "toolu_orphan",
    });

    handlePostToolUse(stdin, db);

    const rows = db.prepare("SELECT * FROM searches").all() as SearchRecord[];
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("orphan search");
    expect(rows[0].results).toBeTruthy();
  });

  it("ignores non WebSearch/WebFetch tools", () => {
    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/test",
      tool_name: "Bash",
      tool_input: { command: "ls" },
      tool_response: { output: "files" },
      tool_use_id: "toolu_bash",
    });

    handlePostToolUse(stdin, db);

    const rows = db.prepare("SELECT * FROM searches").all();
    expect(rows).toHaveLength(0);
  });
});
