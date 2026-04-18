export type SearchType = "search" | "fetch";

export interface NormalizedInput {
  toolUseId: string;
  sessionId: string;
  cwd: string;
  type: SearchType;
  query: string;
  results?: unknown;
}

const SEARCH_TOOLS = new Set(["WebSearch", "SearchWeb", "websearch"]);
const FETCH_TOOLS = new Set(["WebFetch", "FetchURL", "webfetch"]);

export function normalize(raw: any, phase: "pre" | "post"): NormalizedInput | null {
  const toolName = raw?.tool_name ?? raw?.tool;
  if (!toolName) return null;

  let type: SearchType;
  if (SEARCH_TOOLS.has(toolName)) type = "search";
  else if (FETCH_TOOLS.has(toolName)) type = "fetch";
  else return null;

  const input = raw.tool_input ?? raw.args ?? {};
  const query = type === "search" ? input.query ?? "" : input.url ?? "";
  if (!query) return null;

  const toolUseId = raw.tool_use_id ?? raw.tool_call_id ?? raw.callID ?? "";
  const sessionId = raw.session_id ?? raw.sessionID ?? "";
  const cwd = raw.cwd ?? "";

  const result: NormalizedInput = { toolUseId, sessionId, cwd, type, query };
  if (phase === "post") {
    result.results = raw.tool_response ?? raw.tool_output ?? raw.output ?? null;
  }
  return result;
}
