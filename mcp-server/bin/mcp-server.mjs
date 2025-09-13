#!/usr/bin/env node

/**
 * @xbrl-jp/mcp-server
 * MCP Server for XBRL Financial Data API
 * 
 * This is the entry point for the npm package.
 * Users can run this via npx @xbrl-jp/mcp-server
 */

import { main } from "../src/server.js";

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the MCP server
main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exit(1);
});