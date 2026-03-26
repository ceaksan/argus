import type {
  QueryCluster,
  BridgeResult,
  KnowledgeGap,
  MissedConnection,
  ContentSignal,
  SessionEfficiency,
} from "./types";

const GAP_THRESHOLD = 0.3;
const MISSED_THRESHOLD = 0.7;
const CONTENT_CLUSTER_MIN = 3;

interface MinimalRecord {
  session_id: string;
  type: string;
  query: string;
}

export function computeGaps(
  clusters: QueryCluster[],
  bridgeResults: BridgeResult[],
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];
  const resultMap = new Map(bridgeResults.map((r) => [r.query, r]));

  for (const cluster of clusters) {
    const result = resultMap.get(cluster.representative);
    if (!result || !result.available) continue;

    const bestScore =
      result.matches.length > 0
        ? Math.max(...result.matches.map((m) => m.score))
        : 0;

    if (bestScore < GAP_THRESHOLD) {
      gaps.push({
        query: cluster.representative,
        clusterSize: cluster.count,
        bestScore,
      });
    }
  }

  return gaps;
}

export function computeMissedConnections(
  clusters: QueryCluster[],
  bridgeResults: BridgeResult[],
): MissedConnection[] {
  const missed: MissedConnection[] = [];
  const resultMap = new Map(bridgeResults.map((r) => [r.query, r]));

  for (const cluster of clusters) {
    const result = resultMap.get(cluster.representative);
    if (!result || !result.available) continue;

    for (const match of result.matches) {
      if (match.score >= MISSED_THRESHOLD) {
        missed.push({ query: cluster.representative, match });
        break; // one missed connection per cluster is enough
      }
    }
  }

  return missed;
}

export function computeContentSignals(
  clusters: QueryCluster[],
  records: MinimalRecord[],
): ContentSignal[] {
  const signals: ContentSignal[] = [];

  // Count fetch duplicates across all records
  const fetchCounts = new Map<string, number>();
  for (const r of records) {
    if (r.type === "fetch") {
      fetchCounts.set(r.query, (fetchCounts.get(r.query) || 0) + 1);
    }
  }

  let totalRepeatedFetches = 0;
  for (const count of fetchCounts.values()) {
    if (count > 1) totalRepeatedFetches += count - 1;
  }

  for (const cluster of clusters) {
    if (cluster.count < CONTENT_CLUSTER_MIN) continue;

    // Count unique sessions for this cluster's queries
    const clusterSessions = new Set<string>();
    for (const r of records) {
      if (cluster.queries.includes(r.query)) {
        clusterSessions.add(r.session_id);
      }
    }

    signals.push({
      topic: cluster.representative,
      queries: cluster.queries,
      uniqueAngles: cluster.count,
      repeatedFetches: totalRepeatedFetches,
      sessionCount: clusterSessions.size || cluster.sessions.size,
    });
  }

  return signals;
}

export function computeSessionEfficiency(
  records: MinimalRecord[],
): SessionEfficiency[] {
  // Group by session
  const sessions = new Map<string, MinimalRecord[]>();
  for (const r of records) {
    const list = sessions.get(r.session_id) || [];
    list.push(r);
    sessions.set(r.session_id, list);
  }

  const results: SessionEfficiency[] = [];

  for (const [sessionId, recs] of sessions) {
    const searchCount = recs.filter((r) => r.type === "search").length;
    const fetchCount = recs.filter((r) => r.type === "fetch").length;
    const totalQueries = recs.length;

    // Count repeated search queries
    const searchQueries = recs.filter((r) => r.type === "search").map((r) => r.query);
    const uniqueSearches = new Set(searchQueries);
    const repeatCount = searchQueries.length - uniqueSearches.size;

    // Count repeated fetch URLs
    const fetchUrls = recs.filter((r) => r.type === "fetch").map((r) => r.query);
    const uniqueFetches = new Set(fetchUrls);
    const duplicateFetches = fetchUrls.length - uniqueFetches.size;

    // Efficiency formula
    const repeatRatio = totalQueries > 0 ? repeatCount / totalQueries : 0;
    const fetchRepeatRatio = fetchCount > 0 ? duplicateFetches / fetchCount : 0;
    const depthPenalty = Math.min(1, uniqueSearches.size / 20);

    const rawScore = 1 - (repeatRatio * 0.4 + fetchRepeatRatio * 0.3 + depthPenalty * 0.3);
    const score = Math.round(Math.max(0, Math.min(100, rawScore * 100)));

    results.push({
      sessionId,
      totalQueries,
      searchCount,
      fetchCount,
      repeatCount,
      duplicateFetches,
      score,
    });
  }

  return results;
}
