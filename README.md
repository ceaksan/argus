# Hermes

Log and analyze web searches made by AI coding assistants.

![License: ISC](https://img.shields.io/badge/license-ISC-blue) ![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## Why

AI coding assistants make web searches during conversations, but those searches are invisible to you. You have no record of what was searched, what results came back, or how search patterns evolve across sessions and projects.

Hermes captures every web search and fetch, stores them locally, and gives you CLI tools to query, analyze, and export your AI assistant's search history.

## What

- **Automatic capture**: Hooks into Claude Code's PreToolUse/PostToolUse events to log WebSearch and WebFetch calls
- **Local storage**: SQLite database, no cloud, no external dependencies
- **Search history**: Browse, filter, and search through past queries
- **Pattern analysis**: See what topics get searched most, broken down by project
- **Export**: JSON and CSV export for further analysis
- **Zero friction**: One command to install hooks, works silently in the background

## Quick Start

```bash
git clone https://github.com/ceaksan/hermes.git
cd hermes
npm install
npm run build
npm link

hermes hook install
```

Every WebSearch and WebFetch in Claude Code is now logged automatically.

## Usage

### View recent searches

```bash
hermes log                        # Last 20 searches
hermes log --limit 50             # More results
hermes log --type search          # Only web searches (no fetches)
hermes log --since 7d             # Last 7 days
hermes log --project .            # Current project only
hermes log --json                 # JSON output
```

### Statistics

```bash
hermes stats                      # Total counts, top queries, by project
hermes stats --since 30d          # Last 30 days
```

### Search within logs

```bash
hermes search "react hooks"       # Find past searches matching a keyword
```

### Export

```bash
hermes export --format json       # Full JSON export
hermes export --format csv        # CSV for spreadsheets
hermes export --format csv --since 7d
```

### `hermes analyze`

Analyze search patterns against your local knowledge base.

```bash
# Default: last 7 days
hermes analyze

# Filter by time range
hermes analyze --since 30d

# Filter by project
hermes analyze --project /path/to/project

# Specific signal only
hermes analyze --signal gaps|missed|content|efficiency

# Skip dnomia-knowledge bridge (fast, local only)
hermes analyze --skip-semantic

# JSON output
hermes analyze --json
```

**Signals:**
- **Knowledge Gaps**: Topics Claude searched but your knowledge base doesn't cover
- **Missed Connections**: Knowledge exists locally but Claude searched externally anyway
- **Content Signals**: Repeated search clusters that suggest content opportunities
- **Session Efficiency**: Per-session metrics on search depth, repeats, and focus

**Requirements:** For gap and missed connection analysis, [dnomia-knowledge](https://github.com/ceaksan/dnomia-knowledge) must be installed. Without it, only content signals and efficiency are reported.

### Hook management

```bash
hermes hook status                # Check if hooks are active
hermes hook install               # Install hooks
hermes hook uninstall             # Remove hooks
```

## How It Works

```
Claude Code calls WebSearch/WebFetch
         |
  PreToolUse hook --> hermes capture pre --> INSERT (query, no results yet)
         |
  Tool executes, returns results
         |
  PostToolUse hook --> hermes capture post --> UPDATE (add results)
         |
  Later: hermes log/stats/search --> READ from SQLite
```

Hermes registers two hooks in `~/.claude/settings.json`. When Claude Code makes a web search or fetches a URL, the hooks pipe the tool's input and output to `hermes capture`, which writes to a local SQLite database. Hooks are non-blocking: if Hermes fails, Claude Code continues unaffected.

Pre and Post hooks are correlated using Claude Code's `tool_use_id`, a unique identifier for each tool invocation.

## Limitations

- **Claude Code only**: Other AI assistants don't expose hook systems yet. The data model supports multiple assistants, but only Claude Code works today.
- **No conversation context**: What user question triggered a search is not yet captured. Claude Code hooks don't include the user's message in the payload.
- **Local only**: No sync, no cloud, no team features.

## Development

```bash
npm install           # Install dependencies
npm run dev           # Run with tsx (no build needed)
npm run build         # Compile TypeScript
npm test              # Run tests (12 tests)
npm run test:watch    # Watch mode
```

## Architecture

See [architecture.md](architecture.md) for system design, data model, and module map.

## License

[ISC](LICENSE)
