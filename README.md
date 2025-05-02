# tmdb-streaming-availability-mcp

This project provides an MCP (Model Context Protocol) server that exposes movie and streaming availability tools using TMDB and Streaming Availability APIs.

## Prerequisites

- Node.js (v18 or newer recommended)
- NPM or Yarn
- API keys for TMDB and RapidAPI (for Streaming Availability)
- [Claude Desktop](https://www.anthropic.com/claude-desktop) installed

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
TMDB_API_TOKEN=your_tmdb_api_token_here
RAPID_API_KEY=your_rapidapi_key_here
```

You can obtain these keys from:

- [TMDB API](https://www.themoviedb.org/settings/api)
- [RapidAPI Streaming Availability](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability)

## Install Dependencies

```
npm install
npm install -D ts-node typescript
```

## Running the MCP Server Locally

Start the server with:

```
npx ts-node mcp-server.ts
```

Or, if you have compiled to JavaScript:

```
node dist/index.js
```

The server will run and wait for connections via standard input/output (stdio).

## Using with Claude Desktop

1. Open Claude Desktop.
2. Go to **Settings > Tools > Add Custom Tool**.
3. Select **Model Context Protocol (MCP)** as the tool type.
4. For the connection method, choose **Local process** (stdio).
5. Enter the command to start your server (e.g., `npx ts-node mcp-server.ts` or `node dist/index.js`).
6. Save and enable the tool.
7. Claude will now be able to call the movie and streaming tools you have defined.

### Option: Manual Configuration via claude_desktop_config.json

If you prefer, you can manually add the tool configuration to Claude Desktop by editing the `claude_desktop_config.json` file:

1. Locate your Claude Desktop config file, usually at:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
2. Open the file in a text editor.
3. Add (or update) an entry like this inside the top-level object:

```json
"tmdb-streaming-availability": {
  "command": "node",
  "args": [
    "/Users/your-username/workspace/tmdb-streaming-availability-mcp/dist/index.js"
  ],
  "env": {
    "TMDB_API_TOKEN": "your_tmdb_api_token_here",
    "RAPID_API_KEY": "your_rapidapi_key_here"
  }
}
```

- Adjust the `command` and `args` fields if you use `ts-node` or a compiled JS file.
- Replace the environment variable values with your actual API keys.
- Save the file and restart Claude Desktop.

Claude Desktop will now recognize and use your local MCP server as a tool.

### Available Tools

- **getMovies**: Search/filter movies from TMDB.
- **getMovieDetail**: Get detailed info for a movie by TMDB ID.
- **getGenres**: List all movie genres.
- **getStreamingAvailability**: Check streaming platforms for a movie by TMDB ID and country.

## Troubleshooting

- Ensure your API keys are valid and environment variables are set.
- Check the terminal for errors if the server does not start or connect.
- If you change the code, restart the server and reload the tool in Claude Desktop.

## Debugging with MCP Inspector

You can debug and inspect your MCP server using the [MCP Inspector](https://www.npmjs.com/package/@modelcontextprotocol/inspector). This tool helps you visualize and debug MCP tool calls in real time.

To start your server with the inspector, run:

```
npx @modelcontextprotocol/inspector node /Users/davidedispenza/workspace/tmdb-streaming-availability-mcp/build/index.js
```

This will launch the inspector interface, allowing you to monitor requests and responses between Claude Desktop and your MCP server.

If you encounter issues, use this tool to help diagnose problems with tool calls or server behavior.

## License

MIT
