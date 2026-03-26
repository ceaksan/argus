import type { QueryCluster } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "how", "what", "which",
  "when", "where", "who", "why", "not", "no", "or", "and", "but",
  "if", "then", "than", "that", "this", "it", "its", "i", "my", "me",
  "we", "our", "you", "your", "he", "she", "they", "them", "their",
  "use", "using", "pages", "page",
]);

const YEAR_PATTERN = /^20\d{2}$/;
const SPECIAL_CHARS = /[^a-z0-9\s]/g;

export function tokenize(query: string): Set<string> {
  const cleaned = query.toLowerCase().replace(SPECIAL_CHARS, " ");
  const tokens = cleaned.split(/\s+/).filter((t) => {
    if (t.length < 2) return false;
    if (STOP_WORDS.has(t)) return false;
    if (YEAR_PATTERN.test(t)) return false;
    return true;
  });
  return new Set(tokens);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }

  const union = a.size + b.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

export function clusterQueries(
  queries: string[],
  threshold: number = 0.6,
): QueryCluster[] {
  const tokenized = queries.map((q) => ({ query: q, tokens: tokenize(q) }));
  const assigned = new Set<number>();
  const clusters: QueryCluster[] = [];

  for (let i = 0; i < tokenized.length; i++) {
    if (assigned.has(i)) continue;

    const clusterQueryList: string[] = [tokenized[i].query];
    const queue: number[] = [i];
    assigned.add(i);

    // BFS: expand cluster transitively via threshold
    while (queue.length > 0) {
      const current = queue.shift()!;

      for (let j = 0; j < tokenized.length; j++) {
        if (assigned.has(j)) continue;

        const sim = jaccardSimilarity(tokenized[current].tokens, tokenized[j].tokens);
        if (sim >= threshold) {
          clusterQueryList.push(tokenized[j].query);
          assigned.add(j);
          queue.push(j);
        }
      }
    }

    // Representative = longest query (most specific)
    const representative = clusterQueryList.reduce((a, b) =>
      a.length >= b.length ? a : b
    );

    clusters.push({
      representative,
      queries: clusterQueryList,
      sessions: new Set(),
      count: clusterQueryList.length,
    });
  }

  return clusters;
}
