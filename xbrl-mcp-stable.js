#!/usr/bin/env node

// XBRL MCP Server Stable Wrapper
// Prevents EPIPE crashes when Claude Desktop disconnects

// ===== EPIPE Error Handling =====
process.on("uncaughtException", (err) => {
  if (err && err.code === "EPIPE") {
    console.warn("[WARN] Broken pipe ignored - client disconnected");
    return;
  }
  console.error("[ERROR] Uncaught exception:", err);
  throw err;
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[WARN] Unhandled Rejection:", reason);
  // Don't exit on unhandled rejection
});

// Handle stdout/stderr errors
if (process.stdout) {
  process.stdout.on("error", (err) => {
    if (err && err.code === "EPIPE") {
      console.warn("[WARN] stdout EPIPE ignored");
    }
  });
}

if (process.stderr) {
  process.stderr.on("error", (err) => {
    if (err && err.code === "EPIPE") {
      console.warn("[WARN] stderr EPIPE ignored");
    }
  });
}

// Handle SIGTERM/SIGINT gracefully
process.on("SIGTERM", () => {
  console.error("[INFO] SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.error("[INFO] SIGINT received, shutting down gracefully");
  process.exit(0);
});

// ===== Environment Setup =====
// Ensure all required environment variables are set
const requiredEnvVars = {
  XBRL_API_KEY: process.env.XBRL_API_KEY || "xbrl_live_v1_73f62ff5-dd8b-4e50-aff8-943491d4b725_6zi3ZHiytMsT/+DYneku7CNvXpc7UNrI",
  XBRL_API_URL: process.env.XBRL_API_URL || "https://xbrl-api-minimal.vercel.app/api/v1"
};

// Set environment variables
Object.assign(process.env, requiredEnvVars);

console.error("[INFO] Starting XBRL MCP Server (Stable Wrapper)");
console.error("[INFO] XBRL_API_URL:", process.env.XBRL_API_URL);
console.error("[INFO] XBRL_API_KEY:", process.env.XBRL_API_KEY ? "***" + process.env.XBRL_API_KEY.slice(-10) : "not set");

// ===== Load and Run MCP Server =====
async function startServer() {
  try {
    // Use dynamic import for ESM module
    await import("shared-supabase-mcp-minimal/index.js");
  } catch (error) {
    console.error("[ERROR] Failed to start MCP server:", error);
    // Don't exit immediately - wait for restart
    setTimeout(() => {
      console.error("[INFO] Retrying server start...");
      startServer();
    }, 5000);
  }
}

// Start the server
startServer();