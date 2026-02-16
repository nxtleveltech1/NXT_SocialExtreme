# Cursor MCP Server Configuration Guide

This guide explains how to add the NEON, CONTEXT7, and CLERK MCP servers to Cursor.

## Quick Setup

### Method 1: Via Cursor Settings UI (Recommended)

1. **Open Cursor Settings**
   - Press `Ctrl + Shift + P` (Windows) or `Cmd + Shift + P` (Mac)
   - Type "Cursor Settings" and select it
   - Or click the gear icon in the top right corner

2. **Navigate to MCP Settings**
   - Go to `Settings` → `Cursor Settings` → `MCP`
   - Or go to `Tools & Integrations` → `MCP Servers`

3. **Add Each MCP Server**

   **NEON MCP Server:**
   - Click `+ Add new global MCP server`
   - Name: `neon`
   - URL: `https://mcp.neon.tech/mcp`
   - Headers: (leave empty, OAuth will handle authentication)
   - Save and authorize via OAuth when prompted

   **CONTEXT7 MCP Server:**
   - Click `+ Add new global MCP server`
   - Name: `context7`
   - URL: `https://mcp.context7.com/mcp`
   - Headers: Add `CONTEXT7_API_KEY` with your API key value
   - Save and restart Cursor

   **CLERK MCP Server:**
   - Click `+ Add new global MCP server`
   - Name: `clerk`
   - URL: `http://localhost:3000/mcp` (or your production URL)
   - Headers: (leave empty)
   - Save and authorize via OAuth when prompted

### Method 2: Direct Configuration File

Cursor stores MCP configuration in:
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- **Mac**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

You can manually edit this file or copy the configuration from `cursor-mcp-config.json` in this project.

## Configuration Reference

See `cursor-mcp-config.json` for the complete configuration structure.

## Environment Variables

For CONTEXT7, you'll need to set:
- `CONTEXT7_API_KEY` - Your Context7 API key (get it from [context7.com](https://context7.com))

## Verification

After adding the servers:
1. Restart Cursor or reload the window (`Developer: Reload Window`)
2. Check the MCP Servers section in settings to verify all three are connected
3. Start a new chat in Agent Mode and test the connections

## Troubleshooting

- **NEON**: If OAuth doesn't work, check that you're logged into Neon and have proper permissions
- **CONTEXT7**: Ensure your API key is valid and correctly set in headers
- **CLERK**: Make sure your Clerk MCP server is running if using localhost, or update the URL to your production endpoint

## Additional Resources

- [Neon MCP Guide](https://neon.com/guides/cursor-mcp-neon)
- [Context7 Documentation](https://context7.com/docs/installation)
- [Clerk MCP Guide](https://clerk.com/docs/mcp/connect-mcp-client)





