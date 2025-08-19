# MCP Servers Setup for PayHub

## Configured MCP Servers

This project includes configuration for the following MCP (Model Context Protocol) servers:

1. **Supabase** - Read-only access to Supabase project
2. **Context7** - Context management
3. **Playwright** - Browser automation
4. **Fetch** - Multiple fetch operations

## Prerequisites

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Set up Supabase Token (Optional)
For Supabase MCP server to work, you need an access token:

```powershell
# PowerShell
$env:SUPABASE_ACCESS_TOKEN = "your-token-here"

# CMD
set SUPABASE_ACCESS_TOKEN=your-token-here
```

Get your token from: https://supabase.com/dashboard/account/tokens

## Quick Start

### Windows PowerShell
```powershell
.\start-claude-with-mcp.ps1
```

### Windows CMD
```batch
start-claude-with-mcp.bat
```

### Direct Command
```bash
npx @anthropic-ai/claude-code --mcp-config .mcp.json
```

## MCP Server Details

### Supabase Server
- **Purpose**: Query and manage Supabase database
- **Mode**: Read-only (configured with `--read-only` flag)
- **Project**: rydbtsreeggvoblspqxw
- **Requires**: SUPABASE_ACCESS_TOKEN environment variable

### Context7 Server
- **Purpose**: Advanced context management for conversations
- **No additional configuration required**

### Playwright Server
- **Purpose**: Browser automation and testing
- **Can control browser for web scraping and testing**

### Fetch Server
- **Purpose**: Enhanced fetching capabilities
- **Supports multiple concurrent fetch operations**

## Troubleshooting

### MCP servers not loading
1. Ensure you're running Claude Code from the project directory
2. Check that `.mcp.json` exists in the project root
3. Use `--mcp-debug` flag for detailed error messages:
   ```bash
   npx @anthropic-ai/claude-code --mcp-config .mcp.json --mcp-debug
   ```

### Supabase server not working
1. Verify token is set: `echo $env:SUPABASE_ACCESS_TOKEN`
2. Check token permissions at Supabase dashboard
3. Ensure project reference is correct in `.mcp.json`

### View available MCP commands
Once connected, MCP tools will be available in Claude Code. You can see them by typing `/tools` in the chat.

## Security Notes

- Never commit your SUPABASE_ACCESS_TOKEN to git
- The Supabase server is configured as read-only for safety
- MCP servers run locally and communicate via stdio