import { execFileSync } from "child_process";
import type { BridgeMatch, BridgeResult } from "./types";

// Batch script: reads JSON array of queries from stdin, loads model once, returns results for all
const PYTHON_BATCH_SCRIPT = `
import json, sys
try:
    from dnomia_knowledge.embedder import Embedder
    from dnomia_knowledge.search import HybridSearch
    from dnomia_knowledge.store import Store
    import os
    db = os.environ.get("DNOMIA_KNOWLEDGE_DB", os.path.expanduser("~/.local/share/dnomia-knowledge/knowledge.db"))
    store = Store(db)
    embedder = Embedder()
    search = HybridSearch(store, embedder)
    queries = json.loads(sys.stdin.read())
    results = {}
    for q in queries:
        hits = search.search(query=q, limit=5)
        results[q] = [{"file_path": r.file_path, "project_id": r.project_id, "score": r.score, "snippet": r.snippet[:200]} for r in hits]
    print(json.dumps(results))
    store.close()
except Exception as e:
    print(json.dumps({}))
`;

const DK_VENV_PYTHON = process.env.DNOMIA_KNOWLEDGE_PYTHON
  || "/Users/ceair/Documents/DNM_Projects/dnomia-knowledge/.venv/bin/python";

export function parseBridgeOutput(output: string): BridgeMatch[] {
  try {
    const parsed = JSON.parse(output.trim());
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      filePath: item.file_path || "",
      projectId: item.project_id || "",
      score: typeof item.score === "number" ? item.score : 0,
      snippet: item.snippet || "",
    }));
  } catch {
    return [];
  }
}

export function checkBridgeAvailable(pythonPath: string = DK_VENV_PYTHON): boolean {
  if (!pythonPath) return false;
  try {
    execFileSync(pythonPath, ["-c", "import dnomia_knowledge"], {
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

export function queryBridge(
  query: string,
  pythonPath: string = DK_VENV_PYTHON,
): BridgeResult {
  const results = queryBridgeBatch([query], pythonPath);
  return results[0] || { query, matches: [], available: false };
}

export function queryBridgeBatch(
  queries: string[],
  pythonPath: string = DK_VENV_PYTHON,
): BridgeResult[] {
  try {
    const input = JSON.stringify(queries);
    const stdout = execFileSync(pythonPath, ["-c", PYTHON_BATCH_SCRIPT], {
      timeout: 120000,
      input,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });

    const parsed = JSON.parse(stdout.trim());
    if (typeof parsed !== "object" || parsed === null) {
      return queries.map((q) => ({ query: q, matches: [], available: false }));
    }

    return queries.map((q) => {
      const hits = parsed[q];
      if (!Array.isArray(hits)) return { query: q, matches: [], available: true };
      const matches: BridgeMatch[] = hits.map((item: any) => ({
        filePath: item.file_path || "",
        projectId: item.project_id || "",
        score: typeof item.score === "number" ? item.score : 0,
        snippet: item.snippet || "",
      }));
      return { query: q, matches, available: true };
    });
  } catch {
    return queries.map((q) => ({ query: q, matches: [], available: false }));
  }
}
