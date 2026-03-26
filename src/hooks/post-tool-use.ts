import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { insertSearch, updateSearchResults } from "../storage/queries";

interface PostToolUseInput {
  session_id: string;
  cwd: string;
  tool_name: string;
  tool_input: {
    query?: string;
    url?: string;
  };
  tool_response: unknown;
  tool_use_id: string;
}

export function handlePostToolUse(stdinData: string, db: Database.Database): void {
  const input: PostToolUseInput = JSON.parse(stdinData);

  if (input.tool_name !== "WebSearch" && input.tool_name !== "WebFetch") {
    return;
  }

  const resultsJson = JSON.stringify(input.tool_response);

  const updated = updateSearchResults(db, input.tool_use_id, resultsJson);

  if (!updated) {
    const type = input.tool_name === "WebSearch" ? "search" : "fetch";
    const query =
      type === "search" ? input.tool_input.query ?? "" : input.tool_input.url ?? "";

    if (!query) return;

    insertSearch(db, {
      id: ulid(),
      tool_use_id: input.tool_use_id,
      session_id: input.session_id,
      assistant: "claude-code",
      type,
      query,
      results: resultsJson,
      timestamp: new Date().toISOString(),
      project_dir: input.cwd,
    });
  }
}
