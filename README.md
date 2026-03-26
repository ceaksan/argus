# Hermes

Log and analyze web searches made by AI coding assistants.

## Why

AI coding assistants (Claude Code, Cursor, Copilot) make web searches during conversations, but those searches are invisible to you. You have no record of what was searched, what results came back, or how search patterns evolve across sessions and projects.

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
# Clone and build
git clone https://github.com/ceaksan/hermes.git
cd hermes
npm install
npm run build

# Make the CLI available globally
npm link

# Install hooks into Claude Code
hermes hook install
```

That's it. Every WebSearch and WebFetch in Claude Code is now logged automatically.

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

### Search statistics

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
hermes export --format json --since 7d
```

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
  PreToolUse hook fires --> hermes capture pre --> INSERT (query, no results yet)
         |
  Tool executes, returns results
         |
  PostToolUse hook fires --> hermes capture post --> UPDATE (add results)
         |
  Later: hermes log/stats/search --> READ from SQLite
```

Hermes registers two hooks in Claude Code's `~/.claude/settings.json`. When Claude Code makes a web search or fetches a URL, the hooks pipe the tool's input and output to `hermes capture`, which writes to a local SQLite database. The hooks are non-blocking: if Hermes fails, Claude Code continues unaffected.

Pre and Post hooks are correlated using Claude Code's `tool_use_id`, a unique identifier for each tool invocation.

## Configuration

No configuration files or environment variables needed. Everything is stored locally:

| Item | Location |
|------|----------|
| Hooks | `~/.claude/settings.json` |
| Database | `<hermes-dir>/data/hermes.db` |

## Limitations

- **Claude Code only** (v0.1): Other AI assistants (Gemini CLI, Cursor, Copilot) don't expose hook systems yet. The architecture supports multiple assistants, but only Claude Code works today.
- **No conversation context**: The `trigger_text` field (what user question caused the search) is not yet populated. Claude Code hooks don't include the user's message in the hook payload.
- **Local only**: No sync, no cloud, no team features. This is a personal tool.

## Roadmap

- [ ] Web dashboard (`hermes serve`)
- [ ] PostgreSQL support for team/multi-user scenarios
- [ ] Gemini CLI support (when hooks become available)
- [ ] Conversation context extraction (trigger_text population)

## Development

```bash
npm install           # Install dependencies
npm run dev           # Run with tsx (no build needed)
npm run build         # Compile TypeScript
npm test              # Run tests
npm run test:watch    # Watch mode
```

## Architecture

See [architecture.md](architecture.md) for system design, data model, and module map.

## License

ISC
