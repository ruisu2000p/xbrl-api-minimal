#!/usr/bin/env node

// MCP Server Wrapper with EPIPE handling
// This wrapper prevents the server from crashing on EPIPE errors

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE") {
    console.error("[WARN] Broken pipe detected, ignoring:", err.message);
    return;
  }
  console.error("[ERROR] Uncaught exception:", err);
  throw err;
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("[ERROR] Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle SIGPIPE (though Windows doesn't have SIGPIPE, this is for completeness)
process.on("SIGPIPE", () => {
  console.error("[WARN] SIGPIPE received, ignoring");
});

// Set environment variables from arguments if provided
const args = process.argv.slice(2);
if (args.length > 0) {
  try {
    const envVars = JSON.parse(args[0]);
    Object.assign(process.env, envVars);
  } catch (e) {
    // Not JSON, ignore
  }
}

// Import and run the actual MCP server
import("shared-supabase-mcp-minimal/index.js").catch((err) => {
  console.error("[ERROR] Failed to load MCP server:", err);
  process.exit(1);
});