import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../../src/storage/schema";
import { handlePreToolUse } from "../../src/hooks/pre-tool-use";
import type { SearchRecord } from "../../src/storage/queries";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe("handlePreToolUse", () => {
  it("inserts a search record from WebSearch stdin", () => {
    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/Users/test/myproject",
      tool_name: "WebSearch",
      tool_input: { query: "react hooks best practices" },
      tool_use_id: "toolu_123",
    });

    handlePreToolUse(stdin, db);

    const rows = db.prepare("SELECT * FROM searches").all() as SearchRecord[];
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("react hooks best practices");
    expect(rows[0].type).toBe("search");
    expect(rows[0].tool_use_id).toBe("toolu_123");
    expect(rows[0].session_id).toBe("sess_abc");
    expect(rows[0].project_dir).toBe("/Users/test/myproject");
    expect(rows[0].assistant).toBe("claude-code");
    expect(rows[0].results).toBeNull();
  });

  it("inserts a fetch record from WebFetch stdin", () => {
    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/Users/test/myproject",
      tool_name: "WebFetch",
      tool_input: { url: "https://docs.example.com/api" },
      tool_use_id: "toolu_456",
    });

    handlePreToolUse(stdin, db);

    const rows = db.prepare("SELECT * FROM searches").all() as SearchRecord[];
    expect(rows).toHaveLength(1);
    expect(rows[0].query).toBe("https://docs.example.com/api");
    expect(rows[0].type).toBe("fetch");
  });

  it("ignores non WebSearch/WebFetch tools", () => {
    const stdin = JSON.stringify({
      session_id: "sess_abc",
      cwd: "/Users/test/myproject",
      tool_name: "Bash",
      tool_input: { command: "ls" },
      tool_use_id: "toolu_789",
    });

    handlePreToolUse(stdin, db);

    const rows = db.prepare("SELECT * FROM searches").all();
    expect(rows).toHaveLength(0);
  });
});
