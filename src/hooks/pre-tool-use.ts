import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { insertSearch } from "../storage/queries";
import { normalize } from "./normalize";

export function handlePreToolUse(
  stdinData: string,
  db: Database.Database,
  assistant: string = "claude-code",
): void {
  const raw = JSON.parse(stdinData);
  const n = normalize(raw, "pre");
  if (!n) return;

  insertSearch(db, {
    id: ulid(),
    tool_use_id: n.toolUseId,
    session_id: n.sessionId,
    assistant,
    type: n.type,
    query: n.query,
    timestamp: new Date().toISOString(),
    project_dir: n.cwd,
  });
}
