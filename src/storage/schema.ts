import type Database from "better-sqlite3";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS searches (
  id           TEXT PRIMARY KEY,
  tool_use_id  TEXT,
  session_id   TEXT NOT NULL,
  assistant    TEXT NOT NULL,
  type         TEXT NOT NULL,
  query        TEXT NOT NULL,
  trigger_text TEXT,
  results      TEXT,
  timestamp    TEXT NOT NULL,
  project_dir  TEXT
);

CREATE INDEX IF NOT EXISTS idx_searches_timestamp ON searches(timestamp);
CREATE INDEX IF NOT EXISTS idx_searches_assistant ON searches(assistant);
CREATE INDEX IF NOT EXISTS idx_searches_type ON searches(type);
CREATE INDEX IF NOT EXISTS idx_searches_project ON searches(project_dir);
CREATE UNIQUE INDEX IF NOT EXISTS idx_searches_tool_use_id ON searches(tool_use_id);
`;

export function runMigrations(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}
