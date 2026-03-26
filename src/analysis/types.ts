import type { SearchRecord } from "../storage/queries";

export interface QueryCluster {
  representative: string;
  queries: string[];
  sessions: Set<string>;
  count: number;
}

export interface BridgeResult {
  query: string;
  matches: BridgeMatch[];
  available: boolean;
}

export interface BridgeMatch {
  filePath: string;
  projectId: string;
  score: number;
  snippet: string;
}

export interface KnowledgeGap {
  query: string;
  clusterSize: number;
  bestScore: number;
}

export interface MissedConnection {
  query: string;
  match: BridgeMatch;
}

export interface ContentSignal {
  topic: string;
  queries: string[];
  uniqueAngles: number;
  repeatedFetches: number;
  sessionCount: number;
}

export interface SessionEfficiency {
  sessionId: string;
  totalQueries: number;
  searchCount: number;
  fetchCount: number;
  repeatCount: number;
  duplicateFetches: number;
  score: number;
}

export interface AnalysisReport {
  period: { from: string; to: string };
  totalQueries: number;
  totalSessions: number;
  gaps: KnowledgeGap[];
  missed: MissedConnection[];
  contentSignals: ContentSignal[];
  efficiency: SessionEfficiency[];
  bridgeAvailable: boolean;
}
