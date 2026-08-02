@echo off
setlocal
title SHADDAI MCP — Public Edition · Verify
cd /d "%~dp0"

echo [SHADDAI MCP] Public edition — key-free, no setup needed.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is required (18+). Install from https://nodejs.org
  pause
  exit /b 1
)

echo [1/1] Running self-test...
call node mcp-server-rag.js --self-test

echo.
echo Done. The fastest way to use this in Claude is one line (no clone needed):
echo   claude mcp add shaddai -- npx -y shaddai-mcp
echo Or wire this local copy per README.md.
pause
