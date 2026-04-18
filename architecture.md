# Argus - Architecture

CLI tool that logs web searches made by AI coding assistants via hook systems, stores them in SQLite, and provides analysis commands.

<!--
Living Architecture Template v1.0
Source: https://github.com/ceaksan/living-architecture
Depth: L1
Last verified: 2026-03-26
-->

## Stack & Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| TypeScript | 6.x | Language |
| commander | 14.x | CLI framework |
| better-sqlite3 | 12.x | SQLite driver (sync, native) |
| ulid | 3.x | Time-sortable unique IDs |
| cli-table3 | 0.6.x | Terminal table rendering |
| chalk | 4.x | Terminal colors (CJS) |
| vitest | 4.x | Test framework |
| tsx | 4.x | Dev runner |

### Infrastructure

| Layer | Technology | Detail |
|-------|-----------|--------|
| Storage | SQLite (WAL mode) | Local file at `data/argus.db` |
| Distribution | npm link / npx | Global CLI binary |
| Hook Integration | Claude Code hooks | PreToolUse + PostToolUse events |

## Module Map

```
src/
  index.ts              CLI entry point, commander program, capture subcommand
  storage/
    schema.ts           Table + index definitions, migration runner
    db.ts               SQLite connection singleton (WAL, busy_timeout)
    queries.ts          CRUD: insert, update, list, search, stats
  hooks/
    pre-tool-use.ts     Parses PreToolUse stdin, inserts search record
    post-tool-use.ts    Parses PostToolUse stdin, updates record with results
  analysis/
    types.ts            Shared interfaces for analysis
    cluster.ts          Query clustering via Jaccard similarity
    bridge.ts           dnomia-knowledge subprocess bridge
    signals.ts          4 signal types: gap, missed, content, efficiency
  commands/
    log.ts              argus log (list with filters)
    stats.ts            argus stats (aggregations)
    search.ts           argus search <keyword>
    export.ts           argus export --format json|csv
    analyze.ts          argus analyze (pattern analysis)
    hook.ts             argus hook install|uninstall|status
  utils/
    format.ts           Table rendering, JSON output, --since parser
tests/
  storage/
    queries.test.ts     Storage layer tests (6 tests)
  hooks/
    pre-tool-use.test.ts   PreToolUse handler tests (3 tests)
    post-tool-use.test.ts  PostToolUse handler tests (3 tests)
```

### Analysis Module

| File | Purpose |
|------|---------|
| `src/analysis/types.ts` | Shared interfaces for analysis |
| `src/analysis/cluster.ts` | Query clustering via Jaccard similarity |
| `src/analysis/bridge.ts` | dnomia-knowledge subprocess bridge |
| `src/analysis/signals.ts` | 4 signal types: gap, missed, content, efficiency |
| `src/commands/analyze.ts` | CLI command orchestration |

#### Analysis Data Flow

```
Argus SQLite → listSearches(filters)
     ↓
Query Clustering (Jaccard, threshold 0.6)
     ↓
dnomia-knowledge Bridge (subprocess, per cluster)
     ↓
Signal Computation (4 types)
     ↓
Report (terminal or JSON)
```

## Data Flow

### Search Capture Flow

```
User asks question in Claude Code
         |
Claude Code invokes WebSearch or WebFetch tool
         |
    +----+----+
    |         |
PreToolUse   (tool executes)
hook fires        |
    |        PostToolUse
    |        hook fires
    |             |
    v             v
stdin JSON    stdin JSON
(tool_input)  (tool_input + tool_response)
    |             |
    v             v
argus        argus
capture pre   capture post
    |             |
    v             v
INSERT into   UPDATE same row
searches      with results
(results=NULL) (matched by tool_use_id)
    |             |
    +------+------+
           |
       SQLite DB
      (data/argus.db)
```

### Query Flow

```
User runs CLI command
    |
    +-- argus log -----> listSearches() --> formatSearchTable()
    +-- argus stats ---> getStats() ------> formatStatsOutput()
    +-- argus search --> searchInLogs() --> formatSearchTable()
    +-- argus export --> listSearches() --> JSON or CSV to stdout
```

## Data Model

```sql
searches
  id           TEXT PK        ULID (time-sortable)
  tool_use_id  TEXT UNIQUE    Claude Code tool invocation ID (Pre/Post correlation)
  session_id   TEXT NOT NULL  Claude Code session ID
  assistant    TEXT NOT NULL  'claude-code' (extensible: 'gemini', 'chatgpt')
  type         TEXT NOT NULL  'search' | 'fetch'
  query        TEXT NOT NULL  Search query or fetched URL
  trigger_text TEXT           User question that triggered the search (future)
  results      TEXT           JSON: tool response (NULL = pending/cancelled)
  timestamp    TEXT NOT NULL  ISO 8601
  project_dir  TEXT           Working directory (from cwd)
```

Indexes: timestamp, assistant, type, project_dir, tool_use_id (unique)

## Configuration & Environment

| Item | Location | Purpose |
|------|----------|---------|
| Hook config | `~/.claude/settings.json` | PreToolUse/PostToolUse hook entries |
| Database | `<project>/data/argus.db` | SQLite storage (gitignored) |
| CLI binary | `dist/index.js` | Compiled entry point |

No environment variables required. No secrets.

## Constraints & Trade-offs

| Decision | Reason | Trade-off |
|----------|--------|-----------|
| SQLite over PostgreSQL | Zero setup for personal tool, no server needed | Must migrate for multi-user/team use |
| better-sqlite3 (native) over sql.js (WASM) | Faster, sync API, simpler code | Requires native compilation, harder npm distribution |
| chalk@4 (CJS) over chalk@5 (ESM) | CommonJS project, simpler interop | Older version, no ESM features |
| Silent hook failures | Never block Claude Code operation | Search captures can be silently lost |
| tool_use_id for Pre/Post correlation | Built-in Claude Code field, no temp files | Only works with Claude Code hooks |

## Known Tech Debt

1. `trigger_text` column is always NULL. Requires Claude Code API changes or transcript parsing to populate.
2. `getStats()` builds SQL with string concatenation for WHERE clause composition. Works but fragile for extension.
3. No database migrations beyond initial schema. Adding columns later needs migration system.

## Code Hotspots

| File | Risk | Note |
|------|------|------|
| `commands/hook.ts` | Medium | Reads/writes user's `settings.json`, must not corrupt existing hooks |
| `storage/queries.ts` | Low | Core CRUD, most functions are straightforward |
| `hooks/pre-tool-use.ts` | Low | Thin parser, called on every WebSearch/WebFetch |
