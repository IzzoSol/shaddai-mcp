#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "[SHADDAI MCP] Public edition — key-free, no setup needed."

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is required (18+). Install from https://nodejs.org"
  exit 1
fi

echo "[1/1] Running self-test..."
node mcp-server-rag.js --self-test

echo
echo "Done. The fastest way to use this in Claude is one line (no clone needed):"
echo "  claude mcp add shaddai -- npx -y shaddai-mcp"
echo "Or wire this local copy per README.md."
