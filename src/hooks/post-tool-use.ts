import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { insertSearch, updateSearchResults } from "../storage/queries";
import { normalize } from "./normalize";

export function handlePostToolUse(
  stdinData: string,
  db: Database.Database,
  assistant: string = "claude-code",
): void {
  const raw = JSON.parse(stdinData);
  const n = normalize(raw, "post");
  if (!n) return;

  const resultsJson = JSON.stringify(n.results ?? null);
  const updated = updateSearchResults(db, n.toolUseId, resultsJson);

  if (!updated) {
    insertSearch(db, {
      id: ulid(),
      tool_use_id: n.toolUseId,
      session_id: n.sessionId,
      assistant,
      type: n.type,
      query: n.query,
      results: resultsJson,
      timestamp: new Date().toISOString(),
      project_dir: n.cwd,
    });
  }
}
