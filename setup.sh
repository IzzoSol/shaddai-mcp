#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "[SHADDAI MCP] Setting up (public edition)..."

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is required. Install from https://nodejs.org (LTS 18+)."
  exit 1
fi

echo "[1/3] Installing dependencies..."
npm install --no-audit --no-fund

if [ ! -f .env ]; then
  echo "[2/3] Creating .env from template..."
  cp .env.example .env
  echo "  - OPEN .env and add ONE API key, e.g. GROQ_API_KEY from https://console.groq.com"
else
  echo "[2/3] .env already exists — leaving it alone."
fi

echo "[3/3] Self-test..."
node mcp-server-rag.js --self-test

echo
echo "Done. Start the server any time with:  node mcp-server-rag.js"
echo "Wire it into Claude per README.md."
