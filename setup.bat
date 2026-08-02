@echo off
setlocal
title SHADDAI MCP — Public Edition · Setup
cd /d "%~dp0"

echo [SHADDAI MCP] Setting up (public edition)...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is required. Install from https://nodejs.org (LTS 18+), then run setup.bat again.
  pause
  exit /b 1
)

echo [1/3] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [2/3] Creating .env from template...
  copy ".env.example" ".env" >nul
  echo   - OPEN .env and add ONE API key, e.g. GROQ_API_KEY from https://console.groq.com
) else (
  echo [2/3] .env already exists — leaving it alone.
)

echo [3/3] Self-test...
call node mcp-server-rag.js --self-test

echo.
echo Done. Start the server any time with:  node mcp-server-rag.js
echo Wire it into Claude per README.md.
pause
