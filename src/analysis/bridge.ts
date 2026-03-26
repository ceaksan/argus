import { execFileSync } from "child_process";
import type { BridgeMatch, BridgeResult } from "./types";

const PYTHON_SEARCH_SCRIPT = `
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
    results = search.search(query=sys.argv[1], limit=5)
    out = [{"file_path": r.file_path, "project_id": r.project_id, "score": r.score, "snippet": r.snippet[:200]} for r in results]
    print(json.dumps(out))
    store.close()
except Exception as e:
    print(json.dumps([]))
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
      timeout: 5000,
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
  try {
    const stdout = execFileSync(pythonPath, ["-c", PYTHON_SEARCH_SCRIPT, query], {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });
    const matches = parseBridgeOutput(stdout);
    return { query, matches, available: true };
  } catch {
    return { query, matches: [], available: false };
  }
}
