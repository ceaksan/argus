import type Database from "better-sqlite3";

export interface SearchRecord {
  id: string;
  tool_use_id?: string;
  session_id: string;
  assistant: string;
  type: string;
  query: string;
  trigger_text?: string;
  results?: string;
  timestamp: string;
  project_dir?: string;
}

export interface ListFilters {
  limit: number;
  type?: string;
  project?: string;
  since?: string;
  assistant?: string;
}

export function insertSearch(db: Database.Database, record: SearchRecord): void {
  const stmt = db.prepare(`
    INSERT INTO searches (id, tool_use_id, session_id, assistant, type, query, trigger_text, results, timestamp, project_dir)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    record.id,
    record.tool_use_id ?? null,
    record.session_id,
    record.assistant,
    record.type,
    record.query,
    record.trigger_text ?? null,
    record.results ?? null,
    record.timestamp,
    record.project_dir ?? null,
  );
}

export function updateSearchResults(
  db: Database.Database,
  toolUseId: string,
  results: string,
): boolean {
  const stmt = db.prepare(`UPDATE searches SET results = ? WHERE tool_use_id = ?`);
  const info = stmt.run(results, toolUseId);
  return info.changes > 0;
}

export function listSearches(db: Database.Database, filters: ListFilters): SearchRecord[] {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.type) {
    conditions.push("type = ?");
    params.push(filters.type);
  }
  if (filters.project) {
    conditions.push("project_dir = ?");
    params.push(filters.project);
  }
  if (filters.since) {
    conditions.push("timestamp >= ?");
    params.push(filters.since);
  }
  if (filters.assistant) {
    conditions.push("assistant = ?");
    params.push(filters.assistant);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM searches ${where} ORDER BY timestamp DESC LIMIT ?`;
  params.push(filters.limit);

  return db.prepare(sql).all(...params) as SearchRecord[];
}

export function searchInLogs(
  db: Database.Database,
  keyword: string,
  limit: number = 20,
): SearchRecord[] {
  return db
    .prepare(
      `SELECT * FROM searches
       WHERE query LIKE ? OR results LIKE ?
       ORDER BY timestamp DESC LIMIT ?`,
    )
    .all(`%${keyword}%`, `%${keyword}%`, limit) as SearchRecord[];
}

export interface StatsResult {
  total: number;
  searches: number;
  fetches: number;
  topQueries: Array<{ query: string; count: number }>;
  byProject: Array<{ project_dir: string; count: number }>;
}

export function getStats(db: Database.Database, since?: string): StatsResult {
  const whereClause = since ? "WHERE timestamp >= ?" : "";
  const params = since ? [since] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM searches ${whereClause}`).get(...params) as any
  ).count;

  const searches = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM searches ${whereClause ? whereClause + " AND" : "WHERE"} type = 'search'`,
      )
      .get(...(since ? [since] : [])) as any
  ).count;

  const fetches = total - searches;

  const topQueries = db
    .prepare(
      `SELECT query, COUNT(*) as count FROM searches ${whereClause ? whereClause + " AND" : "WHERE"} type = 'search'
       GROUP BY query ORDER BY count DESC LIMIT 10`,
    )
    .all(...params) as Array<{ query: string; count: number }>;

  const byProject = db
    .prepare(
      `SELECT project_dir, COUNT(*) as count FROM searches ${whereClause}
       GROUP BY project_dir ORDER BY count DESC`,
    )
    .all(...params) as Array<{ project_dir: string; count: number }>;

  return { total, searches, fetches, topQueries, byProject };
}
