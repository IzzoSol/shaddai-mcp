#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SHADDAI UNIFIED MCP SERVER — ONE entrypoint for the whole SHADDAI world.
//
// Merges what used to be three separate MCP servers into a single stdio MCP
// server you register ONCE in Claude Desktop / Cursor / Claude Code / Copilot:
//
//   SHADDAI pillar   → the 7-agent team, orchestration, specialist runs
//   Art pillar       → TURTLE image generation
//   Knowledge/RAG    → rag_search, rag_ask, list_rag_docs, memory_search,
//                      get_route (the RAG brain + real router)
//   Money pillar     → spend caps, agent ledger (permit layer)
//
// Everything is proxied to the ONE live SHADDAI API so the same server works
// from anywhere (npx, local node, GitHub Copilot, Codespaces). Zero deps:
// JSON-RPC 2.0 over stdio.
//
// Config (Claude Desktop / Cursor / Copilot mcp settings):
//   { "mcpServers": { "shaddai": {
//       "command": "npx", "args": ["-y", "shaddai-mcp"],
//       "env": { "SHADDAI_API_URL": "https://shaddai-g81x.onrender.com" } } } }
// ─────────────────────────────────────────────────────────────────────────────
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const ecoDirectory = require('./lib/eco-directory');
const ecoLedger = require('./lib/eco-ledger');
const ecoQuota = require('./lib/eco-quota');
const ecoGraph = require('./lib/eco-graph');
const ecoDiscoveries = require('./lib/eco-discoveries');
const ecoSubagents = require('./lib/eco-subagents');
const ecoReputation = require('./lib/eco-reputation');
const ecoScheduler = require('./lib/eco-scheduler');
const ecoPaybox = require('./lib/eco-paybox');
const ecoTelegram = require('./lib/eco-telegram');
const ecoPlots = require('./lib/eco-plots');
const ecoMastery = require('./lib/eco-mastery');
const ecoWorkflows = require('./lib/eco-workflows');
const ecoBridge = require('./lib/eco-bridge');
const ecoCommunity = require('./lib/eco-community');
const ecoBrain = require('./lib/eco-brain');

const VERSION = '1.7.3';

// ── ZEROX integrations (live data + onchain agent commerce) ─────────────────
// Virtuals Protocol ACP key for ZEROX. Tools stay registered but refuse cleanly
// when no key is set. Base URLs are overridable via env for testnet/mirror hosts.
//
// Auto-load: if VIRTUALS_API_KEY did not arrive via env (or arrived empty),
// read ../backend/.env so the key set once in backend/.env just works for the
// MCP too. Only VIRTUAL_* / VIRTUALS_* vars are imported; nothing is ever
// printed or returned.
(function loadBackendEnv() {
  try {
    const envPath = path.join(__dirname, '..', 'backend', '.env');
    const isEmpty = (v) => v === undefined || v === '';
    if (fs.existsSync(envPath) && isEmpty(process.env.VIRTUALS_API_KEY)) {
      const text = fs.readFileSync(envPath, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line.trim());
        if (m && /^VIRTUALS?_/i.test(m[1]) && isEmpty(process.env[m[1]])) {
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
    }
  } catch (_) { /* env load is best-effort */ }
})();
const VIRTUALS_KEY = process.env.VIRTUALS_API_KEY || process.env.VIRTUALS_ACP_KEY || '';
const VIRTUALS_ACP_BASE = (process.env.VIRTUALS_ACP_BASE || 'https://claw-api.virtuals.io').replace(/\/+$/, '');
const VIRTUALS_ACPX_BASE = (process.env.VIRTUALS_ACPX_BASE || 'https://acpx.virtuals.io').replace(/\/+$/, '');
const VIRTUALS_TERMINAL_BASE = (process.env.VIRTUALS_TERMINAL_BASE || 'https://api.virtuals.io').replace(/\/+$/, '');
const VIRTUALS_BASE_WALLET = (process.env.VIRTUALS_BASE_WALLET || '').trim().toLowerCase();
const VIRTUALS_SOL_WALLET = (process.env.VIRTUALS_SOL_WALLET || '').trim();

// Virtuals ACP REST client (Lite Agent API): claw-api host + x-api-key header.
// Errors are returned as data, never thrown, so tools degrade gracefully.
async function vApi(p, method, body) {
  if (!VIRTUALS_KEY) return { error: 'No Virtuals key set.' };
  try {
    const r = await fetch(VIRTUALS_ACP_BASE + p, {
      method: method || 'GET',
      headers: { 'x-api-key': VIRTUALS_KEY, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    const txt = await r.text().catch(() => '');
    let j = {};
    try { j = txt ? JSON.parse(txt) : {}; } catch (_) { return { status: r.status, error: 'non-JSON reply: ' + txt.slice(0, 120) }; }
    if (!r.ok) return { status: r.status, ...j };
    return Object.keys(j).length ? j : { ...j, empty: true };
  } catch (e) { return { error: 'request failed: ' + ((e && e.message) || e) }; }
}
function vkeyRequired() {
  return VIRTUALS_KEY ? null : 'No Virtuals ACP key set. Add VIRTUALS_API_KEY to the MCP server env (or backend/.env VIRTUALS_API_KEY) to use ZEROX Virtuals tools.';
}
function unwrapV(d) {
  if (d && d.data && !Array.isArray(d.data) && typeof d.data === 'object') return d.data;
  return d;
}
function vHttpError(d, hint) {
  const s = d && d.status;
  if (!s) return null;
  const base = 'Virtuals ACP error (HTTP ' + s + '): ' + String((d.error && d.error.message) || (d.data && d.data.error) || d.message || 'no detail');
  return hint ? base + ' — ' + hint : base;
}

// ── ZEROX financial state (commissions + paper P&L), local JSON persistence ───
// No secrets are ever written to ./data. This is the audit trail for fees and
// the paper-trading ledger so ZEROX can demo money management without real funds.
const ZX_DATA_DIR = path.join(__dirname, 'data');
const ZX_COMMISSIONS_FILE = path.join(ZX_DATA_DIR, 'zerox-commissions.json');
const ZX_PAPER_FILE = path.join(ZX_DATA_DIR, 'zerox-paper.json');
try { fs.mkdirSync(ZX_DATA_DIR, { recursive: true }); } catch (_) {}
function zxRead(file, fallback) {
  try { const t = fs.readFileSync(file, 'utf8'); return (t && JSON.parse(t)) || fallback; }
  catch (_) { return fallback; }
}
function zxWrite(file, obj) {
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); return true; } catch (_) { return false; }
}
function zxNow() { return new Date().toISOString(); }
function zxMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function zxNum(v, dflt) { const n = Number(v); return isFinite(n) ? n : dflt; }
function zxIsoWeek(d) {
  const dt = new Date(d);
  const t = new Date(dt.getTime());
  const day = (t.getDay() + 6) % 7;
  t.setDate(t.getDate() - day + 3);
  const first = new Date(t.getFullYear(), 0, 1);
  return ((1 + Math.round((t - first) / 86400000)) / 7 | 0) + '·' + t.getFullYear();
}
const zxCommDefault = () => ({ rate: 0.10, updated: null, deals: [] });
const zxPaperDefault = () => ({ accounts: { main: { cash: 10000, positions: [], trades: [] } } });

// Live pricing sources — majors via CoinGecko, SOL ecosystem mints via DexScreener.
const CG_SYM = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', LINK: 'chainlink', DOT: 'polkadot', LTC: 'litecoin',
  BCH: 'bitcoin-cash', DOGE: 'dogecoin', SHIB: 'shiba-inu', NEAR: 'near', SUI: 'sui',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', TON: 'the-open-network', TRX: 'tron',
  USDC: 'usd-coin', USDT: 'tether', WIF: 'dogwifcoin', BONK: 'bonk',
};
const isSolMint = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(s || '').trim());

// 90s in-memory price cache — avoids CoinGecko free-tier rate limits and keeps
// open/close marks consistent within a window.
const priceCache = new Map();
async function cachedPrice(symOrMint) {
  const key = String(symOrMint || '').trim().toUpperCase();
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.ts < 90000) return hit.data;
  const data = await lookupPrice(symOrMint);
  priceCache.set(key, { data, ts: Date.now() });
  return data;
}
async function cgPrice(ids) {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(60000) });
  return await r.json().catch(() => ({}));
}
async function cgMarkets() {
  const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=30&page=1', { signal: AbortSignal.timeout(60000) });
  return (await r.json().catch(() => [])).filter((x) => x && x.id);
}
async function dexPrice(mint) {
  const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + encodeURIComponent(mint), { signal: AbortSignal.timeout(60000) });
  const d = await r.json().catch(() => ({}));
  const p = (d.pairs || []).find((x) => x.chainId === 'solana' && x.priceUsd) || (d.pairs || [])[0];
  if (!p) return null;
  return { price: Number(p.priceUsd), change24h: Number(p.priceChange && p.priceChange.h24 !== undefined ? p.priceChange.h24 : p.priceChange24h || 0), name: p.baseToken && p.baseToken.symbol, source: 'dexscreener' };
}
async function lookupPrice(symOrMint) {
  const s = String(symOrMint || '').trim();
  if (!s) return null;
  if (isSolMint(s)) return { ...((await dexPrice(s)) || {}), symbol: s.slice(0, 8) + '…' };
  const id = CG_SYM[s.toUpperCase()];
  if (!id) return null;
  const j = await cgPrice([id]);
  const c = j[id];
  if (!c) return null;
  return { price: Number(c.usd), change24h: Number(c.usd_24h_change || 0), name: s.toUpperCase(), source: 'coingecko' };
}

// ── Security hardening (PIKADON review) ──────────────────────────────────────
// 1) The API base must be HTTPS with a real hostname. This blocks SSRF / key
//    exfiltration if SHADDAI_API_URL is ever tampered with — reject before the
//    first request so the SHADDAI_API_KEY can never be shipped to a bad host.
//    Loopback is exempt: traffic to localhost/127.0.0.1/[::1] never leaves the
//    machine, so it cannot ship a key to a remote host. Any non-loopback host
//    must still be HTTPS with a real hostname.
const _envApi = (process.env.SHADDAI_API_URL || 'https://shaddai-beta.onrender.com').replace(/\/+$/, '');
const _LOOPBACK = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const _apiMatch = /^https:\/\/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d{1,5})?$/.exec(_envApi);
if (!_apiMatch && !_LOOPBACK.test(_envApi)) {
  // no access to stdout yet at this point (readline set up below) — fail fast
  throw new Error('SHADDAI_API_URL must be an https:// URL with a hostname, or a http:// loopback address (rejected by PIKADON guard): ' + _envApi);
}
const API = _envApi;
const API_KEY = process.env.SHADDAI_API_KEY || ''; // optional — gate access to paying users

// 2) Least-privilege: money tools are OFF by default. They only register if the
//    operator explicitly opts in with SHADDAI_ENABLE_MONEY=1. stdio MCP is a
//    trusted channel, but create_agent / set_spend_policy / revoke move money —
//    so they should not be exposed by default.
const MONEY_ENABLED = String(process.env.SHADDAI_ENABLE_MONEY || '').toLowerCase() === '1' || String(process.env.SHADDAI_ENABLE_MONEY || '').toLowerCase() === 'true';

// 4) Lightweight token bucket: cap tools/call throughput so a runaway client
//    cannot drain paid `/api/ask` quota or hammer the API.
const RATE_MAX_PER_SEC = Number(process.env.SHADDAI_RATE_PER_SEC) || 5;
let _tokens = RATE_MAX_PER_SEC, _lastRefill = Date.now();
function allowRequest() {
  const now = Date.now();
  _tokens = Math.min(RATE_MAX_PER_SEC, _tokens + ((now - _lastRefill) / 1000) * RATE_MAX_PER_SEC);
  _lastRefill = now;
  if (_tokens >= 1) { _tokens -= 1; return true; }
  return false;
}

const AGENTS_INFO =
`SHADDAI — orchestrator; decomposes goals and coordinates the team
ORACLE — research, knowledge, science, health/body, psychology, esoteric
ZEROX  — revenue, pricing, offers, markets/crypto, business
NEXUS  — engineering, data, code, structuring deliverables
TURTLE — design, images, visuals, branding, logos
QUILL  — writing, descriptions, copy, docs, guides
PIKADON — security, risk, auditing, review`;

// ── Tool definitions (unified across every pillar) ───────────────────────────
const TOOLS = [
  // SHADDAI pillar
  {
    name: 'shaddai_orchestrate',
    description: 'Give SHADDAI a complex goal. It decomposes the task and routes each part to the right specialist agent, then returns a plan (execute=false) or runs it and returns combined results (execute=true).',
    inputSchema: { type: 'object', properties: {
      task: { type: 'string', description: 'The goal / request, in plain language.' },
      execute: { type: 'boolean', description: 'true = run the plan and return results; false (default) = return the plan only.' },
    }, required: ['task'] },
  },
  {
    name: 'shaddai_run_agent',
    description: 'Run a single SHADDAI specialist on a task. The agent uses its real tools (live data, research, github, markets, etc.) and returns the result plus which tools fired.',
    inputSchema: { type: 'object', properties: {
      agent: { type: 'string', description: 'ORACLE | ZEROX | NEXUS | TURTLE | QUILL | PIKADON | SHADDAI' },
      task: { type: 'string', description: 'What to do.' },
    }, required: ['agent', 'task'] },
  },
  {
    name: 'shaddai_generate_image',
    description: 'Generate an image with TURTLE (SHADDAI\'s design agent). Use for logos, illustrations, concept art, thumbnails, social pins, brand visuals, spiritual/art visuals. Give a detailed prompt; returns an image URL you can show or embed.',
    inputSchema: { type: 'object', properties: {
      prompt: { type: 'string', description: 'Detailed description of the image to create.' },
      width: { type: 'number', description: 'optional pixel width (default 1024)' },
      height: { type: 'number', description: 'optional pixel height (default 1024)' },
    }, required: ['prompt'] },
  },
  {
    name: 'shaddai_list_agents',
    description: 'List the 7 SHADDAI agents and what each specializes in. Call this first if unsure which agent fits a task.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'shaddai_search_mastery',
    description: 'Search SHADDAI mastery cards (knowledge distilled from thousands of transcripts). Finds relevant chapters from any agent\'s training: SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON. Returns up to 5 matching passages with source names and relevance scores.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What you want to know — the search question.' },
      agent: { type: 'string', description: 'Optional — narrow to one agent (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON). Defaults to all.' },
    }, required: ['query'] },
  },
  // Money pillar
  {
    name: 'shaddai_create_agent',
    description: 'Create a named SHADDAI agent that can spend money ONLY up to the caps you set. SHADDAI does NOT host inference — the agent runs on the user\'s own API key. This is the permit layer: set daily_cap_usd and per_call_cap_usd, then the agent can pay/trade only inside those limits, and you can revoke it one-click. Every action is written to a public ledger.',
    inputSchema: { type: 'object', properties: {
      name: { type: 'string', description: 'Human name for the agent, e.g. "Zerox-intern".' },
      daily_cap_usd: { type: 'number', description: 'Max USD the agent may spend per day. Default 5.' },
      per_call_cap_usd: { type: 'number', description: 'Max USD for a single call. Default 1. Hard ceiling 2500.' },
      allowed_tools: { type: 'array', items: { type: 'string' }, description: 'Optional tool allow-list; blank = all tools.' },
    }, required: ['name'] },
  },
  {
    name: 'shaddai_set_spend_policy',
    description: 'Update an existing agent\'s spend policy (new daily/per-call caps or tool allow-list). Apply the new limit immediately — existing daily spend counts against the new cap.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'The agent id (agt_...).' },
      daily_cap_usd: { type: 'number', description: 'New max daily spend in USD. Optional.' },
      per_call_cap_usd: { type: 'number', description: 'New max spend per single call in USD. Optional.' },
      allowed_tools: { type: 'array', items: { type: 'string' }, description: 'Optional new tool allow-list; leave unset to keep current.' },
    }, required: ['id'] },
  },
  {
    name: 'shaddai_revoke_agent',
    description: 'Revoke an agent immediately (one-click kill). The agent can no longer spend or run. Irreversible — recorded in the public ledger.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'The agent id (agt_...) to revoke.' },
    }, required: ['id'] },
  },
  {
    name: 'shaddai_get_agent_ledger',
    description: 'Read the public ledger — every agent_create / refuse / spend / revoke with redacted amounts. Show this before and after moving money so the user can see exactly what an agent did.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'Optional — narrow to a single agent id (agt_...). Omit for the full public ledger.' },
    }, required: [] },
  },
  // Knowledge / RAG pillar (the SHADDAI brain)
  {
    name: 'rag_search',
    description: 'Search the SHADDAI RAG brain (mastery / transcrips / knowledge store) and return ranked text passages with scores, source titles and agents. This is the working RAG brain on the live API. Use for bible interpretation, lessons, horoscopes, moon cycles, and any grounded knowledge retrieval.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What to search for.' },
      agent: { type: 'string', description: 'Optional — narrow to one agent (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON). Defaults to all agents.' },
      topK: { type: 'number', description: 'Max results (default 6, max 30).' },
    }, required: ['query'] },
  },
  {
    name: 'rag_ask',
    description: 'Ask the SHADDAI RAG brain a question and get a grounded, cited answer plus sources. Use for "what does SHADDAI know about X?" / bible interpretation, lessons, horoscopes, moon cycles, and any grounded Q&A. NOTE: free tier allows a few grounded asks per day; sending the SHADDAI_API_KEY raises/unlocks it.',
    inputSchema: { type: 'object', properties: {
      question: { type: 'string', description: 'The question to answer from the knowledge base.' },
      agent: { type: 'string', description: 'Optional — agent whose knowledge to answer from (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON). Default SHADDAI.' },
    }, required: ['question'] },
  },
  {
    name: 'list_rag_docs',
    description: 'List the organized knowledge digests for an agent — each a structured breakdown (title, thesis, chapters, insights, quotes) of one source. Use before asking to see what organized knowledge exists.',
    inputSchema: { type: 'object', properties: {
      agent: { type: 'string', description: 'Agent whose digests to list (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON). Default SHADDAI.' },
    }, required: [] },
  },
  {
    name: 'memory_search',
    description: 'Semantic-memory search across saved SHADDAI notes. Returns scored text snippets by meaning, not keyword.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What to search for.' },
      topK: { type: 'number', description: 'Max results (default 10).' },
    }, required: ['query'] },
  },
  {
    name: 'get_route',
    description: 'Route a message to the right SHADDAI agent based on what it is about (routeMessage). Returns which agent should handle it and why. Use when unsure which specialist fits a request.',
    inputSchema: { type: 'object', properties: {
      message: { type: 'string', description: 'The message / request to route.' },
    }, required: ['message'] },
  },
  {
    name: 'brain_overview',
    description: 'High-level stats for the whole SHADDAI knowledge brain: per-agent source/chunk/word counts, top terms, and corpus totals. Use to gauge what knowledge each agent holds before diving in.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'brain_knowledge_map',
    description: 'The organized subject index of the SHADDAI brain — which agent owns which topics, and how many organized sources sit under each. Optional agent narrows to one specialist.',
    inputSchema: { type: 'object', properties: {
      agent: { type: 'string', description: 'Optional — narrow to one agent (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON). Omit for the whole corpus.' },
    }, required: [] },
  },
  {
    name: 'brain_get_digest',
    description: 'Fetch the FULL structured digest for one source (all chapters, insights and quotes), given the agent and the digest name from list_rag_docs.',
    inputSchema: { type: 'object', properties: {
      agent: { type: 'string', description: 'Agent whose digest to fetch (SHADDAI, ORACLE, ZEROX, NEXUS, TURTLE, QUILL, PIKADON).' },
      name: { type: 'string', description: 'The digest name/id shown by list_rag_docs (e.g. "DIGEST_hormozi_100m_offer").' },
    }, required: ['name'] },
  },
  {
    name: 'aura_ingest',
    description: 'Teach an agent: fetch a PUBLIC https URL (Jina → Firecrawl → bundled scraper), chunk it (~500 tokens) and store it in a labeled AURA box. box like "oracle/demo" (private to you) or "hall/docs" (shared, everyone reads free). Metered: free ingests per day, then a paid rail. PIKADON blocks internal/private/admin URLs.',
    inputSchema: { type: 'object', properties: {
      url: { type: 'string', description: 'Public https:// URL to ingest (docs page, article, whitepaper...).' },
      box: { type: 'string', description: 'Box id: "office" | "office/slug" | "office/owner/slug". Default "hall/default".' },
      title: { type: 'string', description: 'Optional friendly title for the box.' },
    }, required: ['url'] },
  },
  {
    name: 'aura_search',
    description: 'Search the AURA boxes the caller can read (own private boxes + every hall/ box) and return ranked snippet hits with source URLs. Complements rag_search (the big TF-IDF brain) with YOUR personal/boxed knowledge.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What to search for.' },
      box: { type: 'string', description: 'Optional — restrict to a box (prefix), e.g. "oracle/demo".' },
      topK: { type: 'number', description: 'Max snippets (default 3, max 8).' },
    }, required: ['query'] },
  },
  {
    name: 'aura_boxes',
    description: 'List the AURA boxes visible to the caller: box id, office, owner, slug, visibility, title, source URL, chunk count. Use before searching to know what boxed knowledge exists.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  // SHADDAI media engine — our own media download engine (loopback sidecar)
  {
    name: 'shaddai_media_status',
    description: 'SHADDAI media engine — check the downloader: engine version, host and the 20+ supported services (YouTube, TikTok, Twitter/X, Instagram, Reddit, Vimeo, Bluesky, SoundCloud, Twitch clips...). Run this first to confirm the engine is online before fetching.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'shaddai_media_fetch',
    description: 'SHADDAI media engine — download a PUBLIC video/audio from a supported service. Returns the file name, status and a working download/save link (open in a browser to save). downloadMode: auto | audio (audio-only) | mute (no audio). PIKADON blocks internal/private URLs.',
    inputSchema: { type: 'object', properties: {
      url: { type: 'string', description: 'Public URL of the media to capture (YouTube, TikTok, Twitter/X, Instagram, Vimeo, Reddit, Bluesky, SoundCloud...).' },
      downloadMode: { type: 'string', description: 'auto (default) | audio (audio only) | mute (video without audio).' },
    }, required: ['url'] },
  },
  {
    name: 'shaddai_capture',
    description: 'SHADDAI capture — ONE tool for all three: media download, web scraping, and the video clipper. mode: media = download a public video/audio (returns a working download link); scrape = turn a public https URL into clean markdown + title + links (SSRF-guarded, max_chars 300..200000, default 200000); clip = forward to the video clipper (clipper_path like /cp, plus optional payload object). Run /api/capture status first if unsure which sub-system is up.',
    inputSchema: { type: 'object', properties: {
      mode: { type: 'string', description: 'media | scrape | clip — what to do with the URL.' },
      url: { type: 'string', description: 'Public https URL to capture, scrape, or clip.' },
      downloadMode: { type: 'string', description: 'media mode: auto (default) | audio | mute.' },
      max_chars: { type: 'number', description: 'scrape mode: how many characters of the page to keep (default 200000).' },
      clipper_path: { type: 'string', description: 'clip mode: endpoint path on the clipper, e.g. /cp.' },
      payload: { type: 'object', description: 'clip mode: JSON payload forwarded to the clipper.' },
    }, required: ['mode', 'url'] },
  },
  // ZEROX pillar — Virtuals Protocol agent commerce (ACP)
  {
    name: 'zerox_virtuals_me',
    description: 'ZEROX — check the SHADDAI Virtuals ACP identity: agent id, wallet address, and registration state. Run this first to confirm the VIRTUALS_API_KEY is registered and active before creating jobs.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'zerox_virtuals_agent',
    description: 'ZEROX — look up a Virtuals marketplace agent and its offerings by agent id. Use to discover what another agent can do before paying it (browse first, then create a job).',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'Virtuals agent id (e.g. "8654") or the public "/api/agents/{id}/details" slug.' },
    }, required: ['id'] },
  },
  {
    name: 'zerox_virtuals_job',
    description: 'ZEROX — create a paid job on the Virtuals ACP marketplace (buy a service from another agent). Needs the provider wallet address, the offering name, and the service requirements JSON. Poll with zerox_virtuals_job_status until COMPLETED/REJECTED/EXPIRED — payment is handled by ACP escrow automatically.',
    inputSchema: { type: 'object', properties: {
      provider_wallet: { type: 'string', description: 'Provider agent wallet address (0x...).' },
      offering: { type: 'string', description: 'Job offering name, e.g. "twitter_search".' },
      requirements: { type: 'string', description: 'Service requirements as JSON, e.g. {"query":"AI agents","count":10}.' },
      automated: { type: 'boolean', description: 'IsAutomated flag. Default true.' },
    }, required: ['provider_wallet', 'offering'] },
  },
  {
    name: 'zerox_virtuals_job_status',
    description: 'ZEROX — poll the status of a Virtuals ACP job by id. Returns phase (REQUEST / COMPLETED / REJECTED / EXPIRED), deliverable, and memo history. Poll until it reaches a terminal phase.',
    inputSchema: { type: 'object', properties: {
      job_id: { type: 'string', description: 'The ACP job id returned by zerox_virtuals_job.' },
    }, required: ['job_id'] },
  },
  {
    name: 'zerox_virtuals_terminal_log',
    description: 'ZEROX — post an activity log entry to the Virtuals agent console (Terminal API) so your agent activity is visible live on virtuals.io while it works. Requires a Terminal access token for this key.',
    inputSchema: { type: 'object', properties: {
      title: { type: 'string', description: 'Activity title, max 255 chars.' },
      body: { type: 'string', description: 'Markdown body of the activity.' },
      category: { type: 'string', description: 'Activity category, e.g. "general" (default "general").' },
      framework: { type: 'string', description: 'Framework name, e.g. "game" (default "game").' },
    }, required: ['title', 'body'] },
  },
  // ZEROX pillar — live markets
  {
    name: 'zerox_market_scan',
    description: 'ZEROX — scan live markets for opportunities: top movers by % change, biggest volume, and the crypto Fear & Greed climate. Use before pricing or recommending trades.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'zerox_price',
    description: 'ZEROX — live price for a crypto symbol (BTC, ETH, SOL, WIF, ...) or a Solana token mint address. Returns price, 24h change and source. Comma-separate for multiple (e.g. "BTC,SOL,WIF").',
    inputSchema: { type: 'object', properties: {
      symbols: { type: 'string', description: 'Symbols or Solana mint addresses, comma-separated.' },
    }, required: ['symbols'] },
  },
  {
    name: 'zerox_sentiment',
    description: 'ZEROX — current crypto Fear & Greed index (0 extreme fear → 100 extreme greed). Use to judge whether markets favor buying (fear) or caution (greed).',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  // ZEROX pillar — commissions & fees
  {
    name: 'zerox_commission_rate',
    description: 'ZEROX — get or set the commission rate ZEROX takes on deals it routes (e.g. 0.10 = 10%). With no args returns the current rate and what a $1,000 deal earns. Persisted to data/zerox-commissions.json.',
    inputSchema: { type: 'object', properties: {
      rate: { type: 'number', description: 'Optional new commission rate, 0..1 (e.g. 0.10 for 10%).' },
    }, required: [] },
  },
  {
    name: 'zerox_record_deal',
    description: 'ZEROX — record a closed deal and auto-compute the commission ZEROX takes on it (commission = flat_usd if given, else gross × current rate). Appends to the commission ledger. Use after an ACP job completes or a service is sold.',
    inputSchema: { type: 'object', properties: {
      gross_usd: { type: 'number', description: 'Gross value of the deal in USD.' },
      counterparty: { type: 'string', description: 'Who paid / was paid (agent name, wallet, or user).' },
      service: { type: 'string', description: 'What was delivered (e.g. "twitter_search job", "report").' },
      venue: { type: 'string', description: 'Venue: "acp", "direct", "subscription", etc. Default "acp".' },
      flat_usd: { type: 'number', description: 'Optional flat fee in USD (overrides the rate).' },
      escrow_ref: { type: 'string', description: 'Optional ACP job id or reference.' },
    }, required: ['gross_usd', 'counterparty', 'service'] },
  },
  {
    name: 'zerox_commissions',
    description: 'ZEROX — commission ledger summary: total gross routed, total fees taken, current rate, per-venue breakdown, and the latest deals.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  // ZEROX pillar — paper trading (no real funds)
  {
    name: 'zerox_paper_open',
    description: 'ZEROX — open a PAPER position (simulated, no real money) at the live price. Sizes with Kelly criterion when confidence is given (else 25% of cash). Use to demo/manage trading for people before any real funds are wired.',
    inputSchema: { type: 'object', properties: {
      symbol: { type: 'string', description: 'Symbol (BTC, SOL, WIF...) or Solana mint.' },
      side: { type: 'string', description: 'buy or sell (short). Default buy.' },
      qty: { type: 'number', description: 'Optional quantity; defaults to a % of account cash.' },
      confidence: { type: 'number', description: 'Optional 0..1 edge estimate used for Kelly sizing.' },
      account: { type: 'string', description: 'Optional account name; default "main".' },
    }, required: ['symbol'] },
  },
  {
    name: 'zerox_paper_close',
    description: 'ZEROX — close a PAPER position at the live price and realize its P&L into the account. Closes by position_id, or by symbol (closes all of it).',
    inputSchema: { type: 'object', properties: {
      symbol: { type: 'string', description: 'Symbol or mint of the position to close.' },
      position_id: { type: 'string', description: 'Exact position id to close (preferred over symbol).' },
      qty: { type: 'number', description: 'Optional partial quantity; default all.' },
      account: { type: 'string', description: 'Optional account name; default "main".' },
    }, required: [] },
  },
  {
    name: 'zerox_paper_portfolio',
    description: 'ZEROX — paper account state: cash, open positions with live unrealized P&L, total equity, realized P&L and win rate. Use to report to people whose money ZEROX is demo-managing.',
    inputSchema: { type: 'object', properties: {
      account: { type: 'string', description: 'Optional account name; default "main".' },
    }, required: [] },
  },
  {
    name: 'zerox_paper_weekly',
    description: 'ZEROX — weekly paper-trading P&L report: this week vs last, best/worst trade, and a running total per week.',
    inputSchema: { type: 'object', properties: {
      account: { type: 'string', description: 'Optional account name; default "main".' },
    }, required: [] },
  },
  // ZEROX pillar — on-chain wallet watch (funding gates)
  {
    name: 'zerox_wallet_status',
    description: 'ZEROX — live balance of the SHADDAI agent wallets (Virtuals ACP provider on Base + Solana agent wallet). Read-only, no funds moved. Use before any real-money action to confirm gas/funding exists.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  // Hall pillar — the SHADDAI economy (forged offices, delegation, collective memory, ledger)
  {
    name: 'forge_spawn_sub',
    description: 'HALL — spawn a lightweight sub-agent under a parent instance (owned office). Role = scanner|analyst|monitor|poster|runner. The sub does a bounded toolset of work; the platform cut is NOT double-charged inside an owner\'s own chain. Same owner, compound labor.',
    inputSchema: { type: 'object', properties: {
      parent_id: { type: 'string', description: 'The owning instance id (e.g. zerox-acct-1).' },
      role: { type: 'string', description: 'scanner | analyst | monitor | poster | runner' },
      name: { type: 'string', description: 'Optional display name for the sub-agent.' },
      tools: { type: 'array', items: { type: 'string' }, description: 'Optional tool allow-list for the sub.' },
      takes_usd: { type: 'number', description: 'Optional per-task attribution the sub "keeps" (default 0.10).' },
    }, required: ['parent_id', 'role'] },
  },
  {
    name: 'forge_delegate',
    description: 'HALL — delegate a batch of tasks to a sub-agent. Returns the work id; the journal is queued for the scheduler (auto-run hooks) or a runner can complete it with forge_complete_work.',
    inputSchema: { type: 'object', properties: {
      sub_id: { type: 'string', description: 'The sub-agent id (sub-...).' },
      tasks: { type: 'array', items: { type: 'string' }, description: 'The tasks, e.g. ["scan So11111111111111111111111111111111111111112","rank top 3"].' },
      est_usd: { type: 'number', description: 'Optional expected payout for this batch (attribution only).' },
    }, required: ['sub_id', 'tasks'] },
  },
  {
    name: 'forge_complete_work',
    description: 'HALL — mark a delegated work batch done and record its results. Credits the sub-agent: calls_done += tasks, earned_usd += expected.',
    inputSchema: { type: 'object', properties: {
      work_id: { type: 'string', description: 'The work item id (wk-...).' },
      results: { type: 'object', description: 'Per-task results object to journal.' },
    }, required: ['work_id'] },
  },
  {
    name: 'forge_sub_status',
    description: 'HALL — list a parent\'s sub-agents, their live work queue, and delegation stats (sub_count, calls done, earned, queued batches).',
    inputSchema: { type: 'object', properties: {
      parent_id: { type: 'string', description: 'The owning instance id.' },
      detail: { type: 'boolean', description: 'true = full per-sub + per-work detail.' },
    }, required: ['parent_id'] },
  },
  {
    name: 'directory_register',
    description: 'HALL — publish a forged office to Office Avenue so other users/agents can find and hire it. Prices are in USDC per tool name.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'Instance id, e.g. zerox-acct-1.' },
      templateId: { type: 'string', description: 'hall | zerox | oracle | quill | turtle | nexus | pikadon' },
      name: { type: 'string', description: 'Display name.' },
      owner: { type: 'string', description: 'Owner identifier.' },
      description: { type: 'string', description: 'What this office offers.' },
      prices_usdc: { type: 'object', description: 'e.g. {"scan": 0.5, "chart": 9}.' },
      status: { type: 'string', description: 'live | sandbox (default live).' },
    }, required: ['id', 'templateId', 'name', 'owner'] },
  },
  {
    name: 'directory_search',
    description: 'HALL — search Office Avenue (instances + services + descriptions). Returns id, template, owner, price list, calls so far.',
    inputSchema: { type: 'object', properties: {
      q: { type: 'string', description: 'Search text; empty = all live instances.' },
      template: { type: 'string', description: 'Optional filter by template id (zerox, oracle, ...).' },
    }, required: [] },
  },
  {
    name: 'directory_list',
    description: 'HALL — list the 7 office templates you can forge, with their default services and accent color.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'graph_log_discovery',
    description: 'ORACLE/HALL — log a collective-memory finding: rug_warning | alpha | pattern | correlation. Links agent → made → discovery → flags → target. Other agents later see it via graph_context.',
    inputSchema: { type: 'object', properties: {
      agent_id: { type: 'string', description: 'The instance id making the finding.' },
      type: { type: 'string', description: 'rug_warning | alpha | pattern | correlation' },
      target: { type: 'string', description: 'What it flags (mint, contract, symbol, topic).' },
      reason: { type: 'string', description: 'Why.' },
      confidence: { type: 'number', description: '0..1 confidence.' },
      was_correct: { type: 'boolean', description: 'Optional — true/false once known (feeds reputation).' },
    }, required: ['agent_id', 'type', 'reason'] },
  },
  {
    name: 'graph_context',
    description: 'ORACLE/HALL — fetch every discovery other agents have logged about a target, ranked by rep_score. Lets an instance inherit warnings (bundle-holder flags, rugs) instead of re-learning.',
    inputSchema: { type: 'object', properties: {
      target: { type: 'string', description: 'The mint/contract/symbol/topic to look up.' },
    }, required: ['target'] },
  },
  {
    name: 'graph_neighbors',
    description: 'ORACLE/HALL — BFS neighborhood around an entity in the AURA-lite graph (entities + edges + paths). Shows how things connect within N hops.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'Entity id.' },
      depth: { type: 'number', description: 'Max hops (default 2).' },
    }, required: ['id'] },
  },
  {
    name: 'ledger_receipt',
    description: 'HALL — log a paid receipt on an instance. Computes the platform split automatically (owner ' + ((1 - ecoLedger.PLATFORM_CUT) * 100) + '%, hall ' + (ecoLedger.PLATFORM_CUT * 100) + '%). Append-only; this is the revenue source of truth.',
    inputSchema: { type: 'object', properties: {
      instance_id: { type: 'string', description: 'The office that earned it.' },
      caller: { type: 'string', description: 'Who paid (user or agent id).' },
      tool: { type: 'string', description: 'Which tool/service was billed.' },
      amount_usdc: { type: 'number', description: 'Gross USDC charged.' },
      note: { type: 'string', description: 'Optional context.' },
    }, required: ['instance_id', 'amount_usdc'] },
  },
  {
    name: 'ledger_summary',
    description: 'HALL — platform ledger summary: receipts, gross, hall cut collected, owner share, per-instance breakdown, payouts made. Use monthly to see what owners are owed.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'quota_status',
    description: 'HALL — free-tier quota check for a user: calls used today vs the free allowance (5/day). After the allowance, paid tools 402.',
    inputSchema: { type: 'object', properties: {
      user_id: { type: 'string', description: 'The user id.' },
    }, required: ['user_id'] },
  },
  {
    name: 'reputation_status',
    description: 'HALL — compute an instance\'s reputation from history: activity, corrected-lead accuracy, discovery citations. Returns tier (Novice→Master) + perks (discount, priority queue, vip tools, featured).',
    inputSchema: { type: 'object', properties: {
      instance_id: { type: 'string', description: 'The instance id.' },
    }, required: ['instance_id'] },
  },
  {
    name: 'sched_add',
    description: 'HALL — schedule a recurring job (zerox.watch BTC threshold, hall.announce, collect_rent, oracle.weekly, pikadon.recheck, sub_agent_work). Returns job id.',
    inputSchema: { type: 'object', properties: {
      type: { type: 'string', description: 'Job type: zerox.watch | hall.announce | collect_rent | oracle.weekly | pikadon.recheck | sub_agent_work.' },
      data: { type: 'string', description: 'Optional JSON job payload, e.g. {"symbol":"BTC","threshold":60000}.' },
      every_ms: { type: 'number', description: 'Repeat interval in ms (default 1h).' },
      at: { type: 'string', description: 'Optional first-run ISO timestamp.' },
    }, required: ['type'] },
  },
  {
    name: 'sched_list',
    description: 'HALL — list scheduled jobs and their last result/error.',
    inputSchema: { type: 'object', properties: {
      type: { type: 'string', description: 'Optional job type filter.' },
    } },
  },
  {
    name: 'sched_cancel',
    description: 'HALL — cancel a scheduled job by id.',
    inputSchema: { type: 'object', properties: {
      job_id: { type: 'string', description: 'The scheduler job id.' },
    }, required: ['job_id'] },
  },
  {
    name: 'x402_info',
    description: 'HALL/PAYBOX — show x402 payment status: receiver wallet, per-tool USDC prices, whether the paywall is enforced, and the quote→intent→confirm flow.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'x402_quote',
    description: 'HALL/PAYBOX — quote the USDC price of a paid tool on the Solana x402 rail.',
    inputSchema: { type: 'object', properties: {
      tool: { type: 'string', description: 'Tool name to price, e.g. zerox_market_scan.' },
    }, required: ['tool'] },
  },
  {
    name: 'x402_intent',
    description: 'HALL/PAYBOX — create a payment intent and return a solana: pay link (memo = intent id). Pay it in any Solana USDC wallet, then x402_confirm.',
    inputSchema: { type: 'object', properties: {
      tool: { type: 'string', description: 'Paid tool name.' },
      user_id: { type: 'string', description: 'Your instance/user id (receives the ledger credit).' },
    }, required: ['tool'] },
  },
  {
    name: 'x402_confirm',
    description: 'HALL/PAYBOX — verify a Solana tx against the intent (reads postTokenBalances on-chain) and log the paid receipt if the USDC delta matches.',
    inputSchema: { type: 'object', properties: {
      intent_id: { type: 'string', description: 'Intent id returned by x402_intent.' },
      tx: { type: 'string', description: 'Solana transaction signature.' },
    }, required: ['intent_id', 'tx'] },
  },
  {
    name: 'hall_post',
    description: 'SHADDAI — post a message to the Hall Telegram (@ShaddaiHall, or a bound chat). Requires TELEGRAM_BOT_TOKEN in backend/.env.',
    inputSchema: { type: 'object', properties: {
      text: { type: 'string', description: 'Message to send.' },
      chat_id: { type: 'string', description: 'Optional override chat id (defaults to TELEGRAM_HALL_CHAT_ID or the user\\\'s bound chat).' },
    }, required: ['text'] },
  },
  {
    name: 'hall_bind',
    description: 'SHADDAI — bind an instance/user to a Telegram chat so its digests and paid-call receipts route there.',
    inputSchema: { type: 'object', properties: {
      user_id: { type: 'string', description: 'Instance or user id.' },
      chat_id: { type: 'string', description: 'Telegram chat id (the user\\\'s DM or a group).' },
    }, required: ['user_id', 'chat_id'] },
  },
  {
    name: 'plot_status',
    description: 'HALL — list digital-property plots across Bazaar/Orcale Tower/Nexus Hub/Arena: owners, prices, rents, visits.',
    inputSchema: { type: 'object', properties: {
      district: { type: 'string', description: 'Optional district filter: bazaar | oracle_tower | nexus_hub | arena.' },
    } },
  },
  {
    name: 'plot_buy',
    description: 'HALL — register purchase of an available plot by an instance (paper ownership now; NFT minting hooks in later).',
    inputSchema: { type: 'object', properties: {
      plot_id: { type: 'string', description: 'Plot id from plot_status.' },
      owner: { type: 'string', description: 'Buying instance id.' },
      tx: { type: 'string', description: 'Optional purchase tx signature.' },
    }, required: ['plot_id', 'owner'] },
  },
  {
    name: 'mastery_create',
    description: 'HALL — an instance packages its patterns + memory snapshot as a sellable Mastery Pack (75% royalty to creator).',
    inputSchema: { type: 'object', properties: {
      instance_id: { type: 'string', description: 'Creating instance id.' },
      name: { type: 'string', description: 'Pack name.' },
      description: { type: 'string', description: 'What a buyer gets.' },
      price_usdc: { type: 'number', description: 'Sale price in USDC.' },
      patterns: { type: 'string', description: 'Optional JSON array of encoded patterns (' + "'" + '{"start":"PM bet","ans":"buy"}...' + "'" + ').' },
      win_rate: { type: 'number', description: 'Optional historical win rate.' },
    }, required: ['instance_id', 'name', 'price_usdc'] },
  },
  {
    name: 'mastery_list',
    description: 'HALL — list mastery packs (optionally by creator), sales and 75% royalty revenue.',
    inputSchema: { type: 'object', properties: {
      instance_id: { type: 'string', description: 'Optional creator instance filter.' },
    } },
  },
  {
    name: 'workflow_create',
    description: 'HALL — build a no-code workflow whose steps are named MCP tools (zerox_price, graph_context, quill_rewrite...). Steps JSON: [{"tool":"zerox_price","args":{"symbol":"BTC"}}].',
    inputSchema: { type: 'object', properties: {
      name: { type: 'string', description: 'Workflow name.' },
      description: { type: 'string', description: 'What it does.' },
      steps: { type: 'string', description: 'JSON array of {tool, args, on_fail} steps.' },
      price_usdc: { type: 'number', description: 'Optional asking price when published.' },
      creator: { type: 'string', description: 'Creator instance id.' },
      published: { type: 'boolean', description: 'True to publish immediately.' },
    }, required: ['name', 'steps'] },
  },
  {
    name: 'workflow_run',
    description: 'HALL — execute a workflow. Step outputs land in {{step_1.output}} etc. and can be interpolated into later step args.',
    inputSchema: { type: 'object', properties: {
      workflow_id: { type: 'string', description: 'id from workflow_list.' },
      context: { type: 'string', description: 'Optional JSON seed context.' },
    }, required: ['workflow_id'] },
  },
  {
    name: 'workflow_list',
    description: 'HALL — list workflows, status (draft/published), step count, price.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bridge_register',
    description: 'HALL — register an external agent (Grok/Fable/Claude) as a live bridge. URL MUST be https. Split on paid calls: platform 15%, external owner 50%, coordination premium 35%.',
    inputSchema: { type: 'object', properties: {
      id: { type: 'string', description: 'Unique agent id.' },
      name: { type: 'string', description: 'Display name.' },
      platform: { type: 'string', description: 'grok | fable | claude | custom.' },
      url: { type: 'string', description: 'Base https endpoint; tool name is appended.' },
      tools: { type: 'string', description: 'Optional JSON array of exposed tool names.' },
      prices_usdc: { type: 'string', description: 'Optional JSON map tool → USDC price.' },
    }, required: ['id', 'url'] },
  },
  {
    name: 'bridge_call',
    description: 'HALL — call a registered external agent tool over the bridge (POST to base/tool). Records a per-call split note when a price exists.',
    inputSchema: { type: 'object', properties: {
      agent_id: { type: 'string', description: 'Registered bridge agent id.' },
      tool: { type: 'string', description: 'Tool name on the external agent.' },
      params: { type: 'string', description: 'Optional JSON params body.' },
    }, required: ['agent_id', 'tool'] },
  },
  // ── Community pillar — the Hall gem economy (same wallet as @ShaddaiHall) ──
  {
    name: 'hall_gem_profile',
    description: 'HALL — a uid\u2019s spark wallet: sparks, score, streak, plays, wins, referral code, invites, bonus brain-asks. Same store the Telegram bots use.',
    inputSchema: { type: 'object', properties: { uid: { type: 'string', description: 'User / chat id (Telegram chat id or any stable id).' } }, required: ['uid'] },
  },
  {
    name: 'hall_daily_bonus',
    description: 'HALL — claim the +25 daily spark refill for a uid (once per day).',
    inputSchema: { type: 'object', properties: { uid: { type: 'string', description: 'User / chat id.' } }, required: ['uid'] },
  },
  {
    name: 'hall_quests',
    description: 'HALL — cash in a uid\u2019s daily quests: roll any bet +10, win any game +20, invite a friend +25. Idempotent per day.',
    inputSchema: { type: 'object', properties: { uid: { type: 'string', description: 'User / chat id.' } }, required: ['uid'] },
  },
  {
    name: 'hall_referral',
    description: 'HALL — issue a uid\u2019s t.me deep-link referral (inviter +100 sparks + 2 free brain-asks per friend; friend +50).',
    inputSchema: { type: 'object', properties: {
      uid: { type: 'string', description: 'User / chat id.' },
      bot_username: { type: 'string', description: 'Optional bot username for the deep link (default ShaddaiHall).' },
    }, required: ['uid'] },
  },
  {
    name: 'hall_claim_referral',
    description: 'HALL — accept a referral code for a uid (one per uid, self-invite blocked).',
    inputSchema: { type: 'object', properties: { uid: { type: 'string', description: 'User / chat id.' }, code: { type: 'string', description: 'The ref_xxx code.' } }, required: ['uid', 'code'] },
  },
  {
    name: 'hall_conviction',
    description: 'HALL — stake sparks on a signal call (skin-in-the-game heat map). Sparks burn into the pool; cosmetics only.',
    inputSchema: { type: 'object', properties: {
      uid: { type: 'string', description: 'User / chat id.' },
      symbol: { type: 'string', description: 'Ticker, e.g. SOL.' },
      amount: { type: 'number', description: 'Sparks to stake (1\u20132000, default 10).' },
    }, required: ['uid', 'symbol'] },
  },
  {
    name: 'hall_hot',
    description: 'HALL — the most-backed calls in the conviction room, ranked by sparks staked.',
    inputSchema: { type: 'object', properties: { n: { type: 'number', description: 'Optional count (default 10, max 20).' } }, required: [] },
  },
  {
    name: 'hall_leaderboard',
    description: 'HALL — the community podium: top scorers, top referrers, hottest calls.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'hall_community_stats',
    description: 'HALL — community totals: souls, plays, wins, referrers, top score, sparks in wallets.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'hall_arcade',
    description: 'HALL — play a headless CPU arcade battle for a uid (basketball/football/dodgeball/sigil-storm) at a spark stake; win doubles up.',
    inputSchema: { type: 'object', properties: {
      uid: { type: 'string', description: 'User / chat id.' },
      game: { type: 'string', description: 'Optional game (default basketball).' },
      bet: { type: 'number', description: 'Optional sparks (1\u20135000, default 10).' },
    }, required: ['uid'] },
  },
  {
    name: 'hall_arena',
    description: 'HALL — two of the Seven fight a scripted best-of-7 tilt; the uid gambles paper sparks on the first agent named (win = 2\u00d7 the bet).',
    inputSchema: { type: 'object', properties: {
      uid: { type: 'string', description: 'User / chat id.' },
      a: { type: 'string', description: 'First agent (your pick), e.g. ORACLE.' },
      b: { type: 'string', description: 'Second agent, e.g. ZEROX.' },
      bet: { type: 'number', description: 'Sparks at stake (5\u2013200, default 10).' },
    }, required: ['uid', 'a', 'b'] },
  },
  {
    name: 'hall_arena_history',
    description: 'HALL — recent agent-vs-agent bouts and their finals.',
    inputSchema: { type: 'object', properties: { n: { type: 'number', description: 'Count (default 5, max 20).' } }, required: [] },
  },
  {
    name: 'hall_astro',
    description: 'ORACLE — zodiac horoscope + moon phase for a sign, grounded and deterministic for today.',
    inputSchema: { type: 'object', properties: { sign: { type: 'string', description: 'Zodiac sign, e.g. aries (default aries).' } }, required: [] },
  },
  {
    name: 'hall_music',
    description: 'TURTLE — compose a procedural music spec (genre, BPM, bars, seconds). No audio bytes returned; recomposable via /music or the same spec.',
    inputSchema: { type: 'object', properties: { genre: { type: 'string', description: 'lofi | synthwave | trap | ambient | house | chip (default lofi).' }, bars: { type: 'number', description: 'Bars 2\u201316 (default 8).' } }, required: [] },
  },
  {
    name: 'hall_moon',
    description: 'ORACLE — current Moon phase and illumination.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'hall_rag_nav',
    description: 'BRAIN — search the LOCAL SHADDAI brain (on-disk per-agent knowledge bases) and return the best passages organized by agent, with highlights. No live API needed. Narrow to one agent for a focused retrieval.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What you want to know.' },
      agent: { type: 'string', description: 'Optional — SHADDAI | ORACLE | ZEROX | NEXUS | TURTLE | QUILL | PIKADON to search one brain only.' },
    }, required: ['query'] },
  },
  {
    name: 'hall_brain_index',
    description: 'BRAIN — what each agent\u2019s knowledge base covers: topic terms + source names per agent. Use first to organize retrieval.',
    inputSchema: { type: 'object', properties: { agent: { type: 'string', description: 'Optional single agent to index.' } }, required: [] },
  },
  {
    name: 'hall_flow',
    description: 'HALL — run a simple composed workflow of real tools: daily (stats+leaderboard+hot+astro), intel (astro+conviction+arena log), know <topic> (local brain retrieval).',
    inputSchema: { type: 'object', properties: {
      name: { type: 'string', description: 'daily | intel | know.' },
      arg: { type: 'string', description: 'Optional — zodiac sign for daily/intel, or the topic for know.' },
    }, required: ['name'] },
  },
  // Web pillar — search + scrape (the missing RAG-brain → open-web leg)
  {
    name: 'web_search',
    description: 'ORACLE/ZEROX — search the open web (Google News RSS then DuckDuckGo) and return ranked titles + snippets + URLs. No key needed. Use when the RAG brain does not already hold the answer, or for current/live data. Pair with rag_search: answer from the library first, fall out to the web here.',
    inputSchema: { type: 'object', properties: {
      query: { type: 'string', description: 'What to search for.' },
      count: { type: 'number', description: 'Max results (default 6, max 12).' },
    }, required: ['query'] },
  },
  {
    name: 'web_scrape',
    description: 'ORACLE/ZEROX — fetch a URL and strip it to readable plain text (scripts/styles/tags removed). Use to pull a live token page, docs, or a competitor page into reasoning. HTTPS only, size-capped.',
    inputSchema: { type: 'object', properties: {
      url: { type: 'string', description: 'Full https:// URL to scrape.' },
      max_chars: { type: 'number', description: 'Optional max characters returned (default 4000).' },
    }, required: ['url'] },
  },
  {
    name: 'hall_web_scrape',
    description: 'BRAIN — scrape a public https URL INTO an agent’s knowledge base. Persists a durable mastery page and live-indexes it (fetch returns organized, cited text). Give a topic worth the brain keeping — not one-off trivia. HTTPS only, SSRF-guarded, JS-heavy sites may return too little text.',
    inputSchema: { type: 'object', properties: {
      url: { type: 'string', description: 'Full https:// URL to scrape and keep.' },
      agent: { type: 'string', description: 'Whose brain it enters: SHADDAI | ORACLE | ZEROX | NEXUS | TURTLE | QUILL | PIKADON.' },
      slug: { type: 'string', description: 'Optional short file name (defaults to host+path).' },
      max_chars: { type: 'number', description: 'Optional cap on kept characters (default 60000).' },
    }, required: ['url', 'agent'] },
  },
];

// Per-agent specialist tools — one named tool per agent so the model auto-picks the right one.
const SPECIALISTS = [
  { key: 'oracle',  agent: 'ORACLE',  desc: 'ORACLE — research, knowledge & intelligence. Use for: researching a topic, comparing options, market/knowledge questions, science, health/body, psychology, and anything needing live/current data.' },
  { key: 'zerox',   agent: 'ZEROX',   desc: 'ZEROX — revenue & business. Use for: pricing a product, building an irresistible offer, monetization strategy, and market/crypto analysis.' },
  { key: 'nexus',   agent: 'NEXUS',   desc: 'NEXUS — engineering & systems. Use for: technical plans, code, architecture, github/npm lookups, and structuring/assembling deliverables.' },
  { key: 'turtle',  agent: 'TURTLE',  desc: 'TURTLE — design direction. Use for: brand and visual concepts, UX ideas, color/type direction. (For an actual image, use shaddai_generate_image.)' },
  { key: 'quill',   agent: 'QUILL',   desc: 'QUILL — writing & copy. Use for: posts, sales pages, emails, docs, product descriptions, and any clear written content.' },
  { key: 'pikadon', agent: 'PIKADON', desc: 'PIKADON — security & risk. Use for: security audits, pre-launch checklists, vulnerability review, and "is this safe?" questions.' },
];
SPECIALISTS.forEach(s => TOOLS.push({
  name: 'shaddai_' + s.key,
  description: s.desc,
  inputSchema: { type: 'object', properties: { task: { type: 'string', description: 'What you want this specialist to do.' } }, required: ['task'] },
}));

// ── Tool discovery helpers (make the 652-tool surface usable) ────────────────
TOOLS.push({
  name: 'tool_search',
  description: 'Search the full SHADDAI tool catalog (652+ tools) by keyword in name or description. Returns matching tool names + one-line descriptions. Use this FIRST when you are not sure which tool fits a task — then call tool_info for the full schema.',
  inputSchema: { type: 'object', properties: {
    query: { type: 'string', description: 'Keyword or phrase, e.g. "price", "scrape", "fear greed", "workflow".' },
    limit: { type: 'number', description: 'Max results (default 15, max 40).' },
  }, required: ['query'] },
});
TOOLS.push({
  name: 'tool_info',
  description: 'Get the full description + input schema for one SHADDAI tool by name. Use after tool_search to learn exactly how to call it (params, types, required).',
  inputSchema: { type: 'object', properties: {
    name: { type: 'string', description: 'Exact tool name, e.g. "zerox_price" or "fetch_price".' },
  }, required: ['name'] },
});
TOOLS.push({
  name: 'tool_categories',
  description: 'List the tool categories/agents (SHADDAI, ZEROX, ORACLE, NEXUS, TURTLE, QUILL, PIKADON, GENERAL) with counts and a short "when to use" guide. Start here to orient yourself in the 652-tool catalog.',
  inputSchema: { type: 'object', properties: {}, required: [] },
});
TOOLS.push({
  name: 'health_check',
  description: 'Check MCP + backend health: API reachability, tool count, money gate state, rate limit. Run this first if anything seems broken.',
  inputSchema: { type: 'object', properties: {}, required: [] },
});
TOOLS.push({
  name: 'rag_scan',
  description: 'Scan a URL into the RAG brain: PIKADON security review + web scrape + secret scan + PII redact + ingest into the agent brain, then search it back. Use when a topic is not in the brain yet.',
  inputSchema: { type: 'object', properties: {
    url: { type: 'string', description: 'Public https URL to scan into the brain.' },
    agent: { type: 'string', description: 'Which agent brain to write into: SHADDAI | ORACLE | ZEROX | NEXUS | TURTLE | QUILL | PIKADON. Default ORACLE.' },
    query: { type: 'string', description: 'Optional: after ingesting, search the brain for this.' },
  }, required: ['url'] },
});

// ── Creative tools (ported from Shaddai-Frames) so ONE MCP carries everything ─
const CREATIVE_TOOL_NAMES = new Set();
try {
  const ct = require('./creative-tools');
  for (const t of (ct.CREATIVE_TOOLS || [])) {
    if (!TOOLS.some(x => x.name === t.name)) {
      TOOLS.push(t);
      CREATIVE_TOOL_NAMES.add(t.name);
    }
  }
} catch (e) {
  process.stderr.write('creative tools load failed: ' + String((e && e.message) || e) + '\\n');
}

// ── Curated SKILL tools (270 methodologies from the Obsidian skills catalog) ──
const SKILL_TOOL_NAMES = new Set();
try {
  const st = require('./skills-tools');
  for (const t of (st.ALL_SKILL_TOOLS || [])) {
    if (!TOOLS.some(x => x.name === t.name)) {
      TOOLS.push(t);
      SKILL_TOOL_NAMES.add(t.name);
    }
  }
} catch (e) {
  process.stderr.write('skill tools load failed: ' + String((e && e.message) || e) + '\\n');
}

// ── Curated NVIDIA skills (48 entries from NVIDIA/skills) ──
const NVIDIA_TOOL_NAMES = new Set();
try {
  const nt = require('./nvidia-skills-tools');
  for (const t of (nt.ALL_NVIDIA_TOOLS || [])) {
    if (!TOOLS.some(x => x.name === t.name)) {
      TOOLS.push(t);
      NVIDIA_TOOL_NAMES.add(t.name);
    }
  }
} catch (e) {
  process.stderr.write('nvidia skill tools load failed: ' + String((e && e.message) || e) + '\\n');
}

// ── Knowledge frameworks (Pixar 22, Save the Cat, Story Arc, thinking models) ──
const FRAMEWORK_TOOL_NAMES = new Set();
try {
  const kt = require('./knowledge-tools');
  for (const t of (kt.FRAMEWORK_TOOLS || [])) {
    if (!TOOLS.some(x => x.name === t.name)) {
      TOOLS.push(t);
      FRAMEWORK_TOOL_NAMES.add(t.name);
    }
  }
} catch (e) {
  process.stderr.write('framework tools load failed: ' + String((e && e.message) || e) + '\\n');
}

// ── Backend tool exposure: dynamically load all 554 internal agent tools ─────
const BACKEND_TOOL_NAMES = new Set();
let BACKEND_TOOLS_LOADED = false;
async function loadBackendTools() {
  if (BACKEND_TOOLS_LOADED) return;
  try {
    const d = await callAPIGet('/api/agent-tools/list');
    if (!d || !d.ok || !Array.isArray(d.tools)) return;
    const existing = new Set(TOOLS.map(t => t.name));
    for (const t of d.tools) {
      if (!t || !t.name || existing.has(t.name)) continue;
      existing.add(t.name);
      BACKEND_TOOL_NAMES.add(t.name);
      TOOLS.push({
        name: t.name,
        description: (t.description || '') + (Array.isArray(t.agents) && t.agents.length ? ' [agents: ' + t.agents.join(', ') + ']' : ''),
        inputSchema: t.inputSchema || { type: 'object', properties: {}, additionalProperties: true },
      });
    }
    BACKEND_TOOLS_LOADED = true;
  } catch (e) {
    process.stderr.write('backend tools load failed: ' + String((e && e.message) || e) + '\n');
  }
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function callAPI(path, body, method) {
  const headers = { 'Content-Type': 'application/json', 'x-shaddai-mcp': '1' };
  if (API_KEY) headers['x-shaddai-key'] = API_KEY;
  if (process.env.SHADDAI_MCP_UID) headers['x-user-id'] = process.env.SHADDAI_MCP_UID;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch(API + path, { method: method || 'POST', headers, body: JSON.stringify(body || {}), signal: ctrl.signal });
    clearTimeout(timer);
    return r.json().catch(() => ({ error: 'bad response from SHADDAI API (' + r.status + ')' }));
  } catch (e) {
    clearTimeout(timer);
    return { error: 'request failed: ' + ((e && e.message) || e) };
  }
}

async function callAPIGet(path) {
  const headers = { 'x-shaddai-mcp': '1' };
  if (API_KEY) headers['x-shaddai-key'] = API_KEY;
  if (process.env.SHADDAI_MCP_UID) headers['x-user-id'] = process.env.SHADDAI_MCP_UID;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch(API + path, { method: 'GET', headers, signal: ctrl.signal });
    clearTimeout(timer);
    return r.json().catch(() => ({ error: 'bad response from SHADDAI API (' + r.status + ')' }));
  } catch (e) {
    clearTimeout(timer);
    return { error: 'request failed: ' + ((e && e.message) || e) };
  }
}

function fmtAgentLine(a) {
  if (!a || typeof a === 'string') return String(a || '?');
  return a.id +
    (a.name ? ' "' + a.name + '"' : '') +
    ' daily=$' + a.daily_cap_usd + ' call=$' + a.per_call_cap_usd +
    ' spent_today=$' + (a.spent_today || 0) +
    ' status=' + (a.revoked ? 'REVOKED' : 'active');
}

function fmtLedger(entries) {
  if (!entries || !entries.length) return 'Ledger is empty — nothing has been spent or revoked yet.';
  return entries.map((e) =>
    '[' + (e.at || e.ts || '') + '] ' + (e.agent || '?') + ' ' + (e.kind || e.type || 'event') +
    (e.amount_usd != null ? ' amount=$' + e.amount_usd : '') +
    (e.status ? ' status=' + e.status : '') +
    (e.tool ? ' tool=' + e.tool : '') +
    (e.reason ? ' — ' + e.reason : '')
  ).slice(0, 60).join('\n');
}

// ── Tool execution ───────────────────────────────────────────────────────────
async function callTool(name, args) {
  args = args || {};
  await loadBackendTools();

  // Least-privilege gate: money tools refuse unless the operator explicitly
  // enabled them (SHADDAI_ENABLE_MONEY=1). Defensive default (PIKADON).
  if (!MONEY_ENABLED && /^shaddai_(create_agent|set_spend_policy|revoke_agent|get_agent_ledger)$/.test(name)) {
    throw new Error('Money tools are disabled by default (PIKADON). To enable, set SHADDAI_ENABLE_MONEY=1 in the server env.');
  }

  if (name === 'shaddai_list_agents') return AGENTS_INFO;

  // Tool discovery helpers
  if (name === 'tool_search') {
    await loadBackendTools();
    const q = String(args.query || '').toLowerCase();
    const limit = Math.min(Number(args.limit) || 15, 40);
    const hits = TOOLS.filter(t => {
      const hay = (t.name + ' ' + (t.description || '')).toLowerCase();
      return q.split(/\s+/).every(w => hay.includes(w));
    }).slice(0, limit);
    if (!hits.length) return 'No tools match "' + args.query + '". Try broader keywords.';
    return hits.map(t => '• ' + t.name + ' — ' + String(t.description || '').slice(0, 110)).join('\\n');
  }
  if (name === 'tool_info') {
    await loadBackendTools();
    const t = TOOLS.find(x => x.name === args.name);
    if (!t) return 'Unknown tool: ' + args.name + '. Use tool_search to find it.';
    return t.name + '\\n' + (t.description || '') + '\\n\\nInput schema:\\n' + JSON.stringify(t.inputSchema || {}, null, 2);
  }
  if (name === 'tool_categories') {
    await loadBackendTools();
    const cats = {
      SHADDAI: 'Orchestration, RAG brain, memory, media capture, workflows, hall economy.',
      ZEROX: 'Prices, markets, sentiment, paper trading, commissions, Virtuals ACP, wallets.',
      ORACLE: 'Research, web search, scraping, brain indexing, discoveries, reputation.',
      NEXUS: 'Engineering, data, code, github/npm, dev tools, solana, nexus tools.',
      TURTLE: 'Design, images, branding, sacred geometry, music, UI stack.',
      QUILL: 'Writing, copy, docs, A/B tests, marketing skills.',
      PIKADON: 'Security audits, password checks, sandbox, compliance, security tools.',
      GENERAL: 'Crypto, market, web, encoding, utility, and uncategorized tools.',
    };
    const counts = {};
    for (const t of TOOLS) {
      // best-effort: curated tools don't carry an agent tag; count by name prefix
    }
    // count backend tools by their agent tag via the list endpoint
    let backendCounts = {};
    try {
      const d = await callAPIGet('/api/agent-tools/list');
      if (d && d.ok) for (const t of d.tools) {
        const ag = (Array.isArray(t.agents) && t.agents[0]) || 'GENERAL';
        backendCounts[ag] = (backendCounts[ag] || 0) + 1;
      }
    } catch (_) {}
    const curatedCounts = { SHADDAI: 98, ZEROX: 0, ORACLE: 0, NEXUS: 0, TURTLE: 0, QUILL: 0, PIKADON: 0, GENERAL: 0 };
    // merge: curated 98 split roughly; just show backend counts + total
    const lines = Object.keys(cats).map(k => {
      const c = backendCounts[k] || 0;
      return '• ' + k + ' (' + c + ' backend tools) — ' + cats[k];
    });
    lines.push('');
    lines.push('Total tools: ' + TOOLS.length + ' (curated MCP + backend agent tools).');
    lines.push('Use tool_search <keyword> to find tools, tool_info <name> for full schema.');
    return lines.join('\\n');
  }
  if (name === 'health_check') {
    await loadBackendTools();
    let backendOk = false, toolCount = 0;
    try {
      const d = await callAPIGet('/api/health');
      backendOk = !!d && (d.ok !== false);
    } catch (_) {}
    try {
      const d = await callAPIGet('/api/agent-tools/list');
      if (d && d.ok) toolCount = d.count || 0;
    } catch (_) {}
    return 'MCP health:\\n' +
      '  API base: ' + API + '\\n' +
      '  Backend reachable: ' + backendOk + '\\n' +
      '  Backend tools: ' + toolCount + '\\n' +
      '  MCP tools loaded: ' + TOOLS.length + '\\n' +
      '  NVIDIA skill tools: ' + NVIDIA_TOOL_NAMES.size + '\\n' +
      '  Money gate: ' + (MONEY_ENABLED ? 'ON' : 'OFF') + '\\n' +
      '  Rate limit: ' + RATE_MAX_PER_SEC + '/s\\n' +
      '  Backend tool names cached: ' + BACKEND_TOOL_NAMES.size;
  }
  // Creative tools + curated SKILL tools + NVIDIA skills + knowledge frameworks: run their `run`.
  if (CREATIVE_TOOL_NAMES.has(name) || SKILL_TOOL_NAMES.has(name) || NVIDIA_TOOL_NAMES.has(name) || FRAMEWORK_TOOL_NAMES.has(name)) {
    const t = TOOLS.find(x => x.name === name);
    if (t && typeof t.run === 'function') return t.run(args);
  }

  // Generic dispatch for the 554 backend agent tools (loaded dynamically).
  if (BACKEND_TOOL_NAMES.has(name)) {
    const d = await callAPI('/api/agent-tools/run', { name, params: args });
    if (d.error || d.ok === false) return 'Error: ' + (d.error || 'tool failed');
    return d.result != null ? d.result : JSON.stringify(d);
  }
  if (name === 'shaddai_orchestrate') {
    const d = await callAPI('/api/orchestrate', { task: args.task, execute: !!args.execute });
    if (d.error) return 'Error: ' + d.error;
    let out = 'Deliverable: ' + (d.deliverable || '') +
      '\nAgents: ' + (d.agents || []).join(', ') +
      '\n\nPlan:\n' + (d.plan || []).map((s, i) => (i + 1) + '. ' + s.agent + ': ' + s.task).join('\n');
    if (Array.isArray(d.results)) {
      out += '\n\nResults:\n' + d.results.map(r =>
        '— ' + r.agent + (r.toolsUsed && r.toolsUsed.length ? ' [' + r.toolsUsed.join(', ') + ']' : '') +
        ':\n' + (r.response || r.error || '')).join('\n\n');
    }
    return out;
  }

  if (name === 'shaddai_run_agent') {
    const d = await callAPI('/api/agentic/run', { agent: args.agent, task: args.task });
    if (d.error) return 'Error: ' + d.error;
    const tools = d.toolsUsed && d.toolsUsed.length ? '[tools used: ' + d.toolsUsed.join(', ') + ']\n\n' : '';
    return tools + (d.response || '');
  }

  if (name === 'shaddai_generate_image') {
    const d = await callAPI('/api/image/generate', {
      prompt: args.prompt, width: args.width || 1024, height: args.height || 1024,
    });
    const url = d.url || d.image_url;
    if (!url) return 'Error: ' + (d.error || 'no image returned');
    return 'TURTLE generated an image:\n' + url + '\n\n![generated image](' + url + ')';
  }

  if (name === 'shaddai_search_mastery') {
    const d = await callAPI('/api/mastery/search', { query: args.query, agent: args.agent || '' });
    if (d.error) return 'Error: ' + d.error;
    if (!d.ok || !d.results || !d.results.length) return 'No mastery matches found for "' + args.query + '".';
    return d.results.map((r, i) =>
      '[' + (i + 1) + '] ' + r.source + ' (relevance: ' + r.score + ')\n' + r.chunk
    ).join('\n\n');
  }

  // Knowledge / RAG pillar — brain-server TF-IDF brain (working on the live API)
  if (name === 'rag_search') {
    const qs = 'q=' + encodeURIComponent(args.query) +
      (args.agent ? '&agent=' + encodeURIComponent(args.agent.toUpperCase()) : '') +
      '&k=' + (Number(args.topK) || 6);
    const d = await callAPIGet('/api/search?' + qs);
    if (d.error) return 'Error: ' + d.error;
    const results = d.results || [];
    if (!results.length) return 'No knowledge matches found for "' + args.query + '".';
    return results.map((r, i) =>
      '[' + (i + 1) + '] ' + (r.title || r.source || '?') +
      ' [' + (r.agent || '?') + ', score: ' + (r.score != null ? Math.round(r.score * 100) : '?') + ']\n' +
      (r.text || '') + (r.timeLabel ? ' (at ' + r.timeLabel + ')' : '')
    ).join('\n\n');
  }

  if (name === 'rag_scan') {
    const url = String(args.url || '');
    const agent = String(args.agent || 'ORACLE').toUpperCase();
    if (!/^https:\/\//i.test(url)) return 'Error: url must be a public https URL (PIKADON SSRF guard).';
    // 1. PIKADON: scrape + secret scan + PII redact
    const scrub = await callAPI('/api/agent-tools/run', { name: 'detect_secrets', params: { text: url } });
    const pii = await callAPI('/api/agent-tools/run', { name: 'redact_pii', params: { text: url } });
    const hasSecrets = scrub && scrub.ok && /"secretsFound":\s*[1-9]/.test(String(scrub.result || ''));
    if (hasSecrets) return 'PIKADON blocked: the target content appears to contain secrets. Not ingesting.';
    // 2. Ingest into the agent brain (same path as hall_web_scrape)
    let ingText = '';
    let ingOk = false;
    try {
      const rs = require('./lib/rag-scrape');
      const res = await rs.ingest({ agent: agent, url: url });
      if (res && res.ok) {
        ingOk = true;
        ingText = '\u{1F9E0} **' + res.agent + ' brain now holds** `' + res.slug + '` — ' + (res.chars || 0).toLocaleString() + ' chars\n' + (res.title || '') + '\n' + (res.url || url) + (res.deduped ? '\n(already indexed — no duplicate)' : '\nlive-indexed; durable copy at ' + (res.path || ''));
      } else {
        ingText = 'Scrape failed: ' + ((res && res.error) || 'unknown');
      }
    } catch (e) {
      ingText = 'Scrape failed: ' + String((e && e.message) || e);
    }
    if (!ingOk) return 'Error: brain ingest failed — ' + ingText;
    let out = 'Scanned into ' + agent + '\'s brain: ' + url + '\n' + ingText;
    if (pii && pii.ok) out += '\n\n[PIKADON PII scan: ' + String(pii.result).slice(0, 160) + ']';
    if (args.query) {
      const s = await callAPIGet('/api/search?q=' + encodeURIComponent(args.query) + '&agent=' + encodeURIComponent(agent) + '&k=3');
      const res = s && s.results ? s.results : [];
      if (res.length) {
        out += '\n\n--- Brain search for "' + args.query + '" ---\n' + res.map((r, i) =>
          '[' + (i + 1) + '] ' + (r.title || r.source || '?') + ' [score: ' + (r.score != null ? Math.round(r.score * 100) : '?') + ']\n' + (r.text || '').slice(0, 300)
        ).join('\n\n');
      } else {
        out += '\n\n--- No brain hits for "' + args.query + '" yet. ---';
      }
    }
    return out;
  }

  if (name === 'rag_ask') {    const qs = 'q=' + encodeURIComponent(args.question) +
      '&agent=' + encodeURIComponent((args.agent || 'SHADDAI').toUpperCase());
    const d = await callAPIGet('/api/ask?' + qs);
    if (d.error) return 'Error: ' + d.error;
    if (d.upgrade) return 'Free tier limit reached (' + d.message + '). Upgrade at ' + d.upgrade +
      ' or set the SHADDAI_API_KEY to unlock more.';
    let out = (d.answer || '').trim();
    if (d.llm_powered) out += '\n\n(powered by ' + d.provider + ', agent ' + d.agent + ')';
    if (d.relevant === false) out += '\n\n[LOW RELEVANCE — the brain has no strong knowledge on this. Use web_search for current data.]';
    else if (d.confidence != null) out += '\n\n[confidence: ' + d.confidence + ']';
    if (Array.isArray(d.sources) && d.sources.length) {
      out += '\n\nSources:\n' + d.sources.map((s, i) =>
        (i + 1) + '. ' + s.title + ' [score: ' + (s.score != null ? Math.round(s.score * 100) : '?') + ']'
      ).join('\n');
    }
    return out || 'No grounded answer returned for that question.';
  }

  if (name === 'list_rag_docs') {
    const agent = (args.agent || 'SHADDAI').toUpperCase();
    const d = await callAPIGet('/api/digests?agent=' + encodeURIComponent(agent));
    if (d.error) return 'Error: ' + d.error;
    const digests = d.digests || [];
    if (!digests.length) return 'No digests for "' + agent + '" yet.';
    return 'Knowledge digests for ' + agent + ' (' + d.count + '):\n' + digests.map((doc, i) => {
      const line = (i + 1) + '. ' + (doc.title || doc.name) +
        (doc.runtimeLabel ? ' (' + doc.runtimeLabel + ')' : '') +
        ' — ' + doc.chapters + ' chapters, ' + doc.insights + ' insights, ' + doc.quotes + ' quotes';
      const thesis = String(doc.thesis || '').slice(0, 160);
      return thesis ? line + '\n   ' + thesis : line;
    }).join('\n');
  }

  if (name === 'memory_search') {
    const d = await callAPI('/api/rag/memory-search', { query: args.query, topK: args.topK || 10 });
    if (d.error) return 'Error: ' + d.error;
    const results = d.results || [];
    if (!results.length) return 'No memory matches found for "' + args.query + '".';
    return results.map((r, i) =>
      '[' + (i + 1) + '] (' + r.type + ', score: ' + r.score + ')\n' + r.text
    ).join('\n\n');
  }

  if (name === 'get_route') {
    const d = await callAPIGet('/api/route?q=' + encodeURIComponent(args.message));
    if (d.error) return 'Error: ' + d.error;
    const best = d && d.ranked && d.ranked[0];
    const agent = (best && best.agent) || d.routedAgent || 'SHADDAI';
    let out = 'Routed to ' + agent;
    if (best && best.score != null) out += ' (score: ' + Math.round(best.score * 100) + ')';
    if (Array.isArray(d.matchedTopics) && d.matchedTopics.length) out += '\nMatched topics: ' + d.matchedTopics.join(', ');
    if (Array.isArray(d.knows) && d.knows.length) out += '\nWhy: ' + d.knows.map(k => k.topic + ' (' + k.sources + ' sources)').join(', ');
    return out;
  }

  if (name === 'brain_overview') {
    const d = await callAPIGet('/api/overview');
    if (d.error) return 'Error: ' + d.error;
    const lines = (d.agents || []).map(a =>
      '• ' + (a.id || '?') + ' — ' + (a.docs || 0) + ' sources, ' + (a.chunks || 0) + ' chunks, ' +
      (a.words || 0) + ' words' + ((a.top_terms || []).length ? ' | top: ' + a.top_terms.slice(0, 6).join(', ') : '')
    );
    return 'SHADDAI brain (' + (d.built || '?') + '):\n' +
      (d.videos != null ? 'Sources: ' + d.videos + ' · ' : '') +
      (d.chunks != null ? 'Chunks: ' + d.chunks + ' · ' : '') +
      (d.terms != null ? 'Terms: ' + d.terms + ' · ' : '') +
      (d.words != null ? 'Words: ' + d.words : '') +
      '\n\n' + lines.join('\n');
  }

  if (name === 'brain_knowledge_map') {
    const qs = args.agent ? '?agent=' + encodeURIComponent(String(args.agent).trim()) : '';
    const d = await callAPIGet('/api/knowledge-map' + qs);
    if (d.error) return 'Error: ' + d.error;
    if (qs && d.agent) {
      const subj = (d.subjects || []).map(s =>
        '• ' + s.topic + ' [' + s.rank + '] — ' + s.count + ' sources'
      );
      return d.agent + ' — ' + d.theme + ' (owns: ' + (d.primary || []).join(', ') + ')\n' +
        (d.organized != null ? 'Organized sources: ' + d.organized + ' / ' + d.sources + '\n' : '') +
        '\nSubjects:\n' + (subj.length ? subj.join('\n') : 'none yet');
    }
    const lines = (d.agents || []).map(a =>
      '• ' + a.agent + ' — ' + a.theme + ' (' + a.sources + ' sources, ' + a.organized + ' organized)'
    );
    return 'SHADDAI knowledge map:\n' + lines.join('\n') +
      '\n\nGLOBAL subjects:\n' + (d.subjects || []).slice(0, 25)
        .map(s => '• ' + s.topic + ' — ' + s.total + ' sources across ' + s.agents.length + ' agents').join('\n');
  }

  if (name === 'brain_get_digest') {
    const agent = String(args.agent || 'SHADDAI').toUpperCase();
    const qs = 'agent=' + encodeURIComponent(agent) + '&name=' + encodeURIComponent(String(args.name));
    const d = await callAPIGet('/api/digest?' + qs);
    if (d.error) return 'Error: ' + d.error;
    let out = 'Digest: ' + (d.title || d.name || args.name);
    if (d.source) out += '\nSource: ' + d.source;
    if (d.thesis) out += '\n\nThesis: ' + d.thesis;
    if (Array.isArray(d.chapters) && d.chapters.length) {
      out += '\n\nChapters:\n' + d.chapters.map((c, i) => {
        let s = (i + 1) + '. ' + (c.label || c.title || c.name || ('Chapter ' + (i + 1)));
        if (Array.isArray(c.insights) && c.insights.length) {
          s += '\n   Insights: ' + c.insights.map(ins => (typeof ins === 'object' ? (ins.text || ins.insight || '') : ins)).join(' | ');
        }
        if (c.quote && (typeof c.quote === 'string' || c.quote.text)) {
          s += '\n   Quote: "' + (typeof c.quote === 'string' ? c.quote : c.quote.text) + '"';
        }
        return s;
      }).join('\n');
    }
    if (Array.isArray(d.quotes) && d.quotes.length) {
      out += '\n\nQuotes:\n' + d.quotes.map(q => '• "' + (typeof q === 'object' ? (q.text || q.quote || '') : q) + '"').join('\n');
    }
    return out || 'Digest "' + args.name + '" returned no detail.';
  }

  // AURA BRAIN — boxed knowledge (COMPARTMENT architecture, Mettered ingest)
  if (name === 'aura_ingest') {
    const d = await callAPI('/api/aura-brain/ingest', { url: args.url, box: args.box, title: args.title });
    if (d.ok) {
      return 'Ingested → box ' + d.box + ' [' + d.visibility + ']\n• title: ' + (d.title || '') +
        '\n• source: ' + d.sourceUrl + '\n• chunks: ' + d.chunks +
        '\n• quota left today: ' + d.quota.left + '/' + d.quota.cap +
        '\n\nAsk about it with aura_search (or Telegram /ask).';
    }
    if (d.code === 'QUOTA') return 'Free ingest quota used up today (PIKADON meter). Flip to paid (x402 Solana USDC rail) or wait for the daily reset:\n' + (d.upgrade || '');
    return 'Error: ' + (d.error || JSON.stringify(d));
  }

  if (name === 'aura_search') {
    const qs = 'q=' + encodeURIComponent(args.query) +
      (args.box ? '&box=' + encodeURIComponent(args.box) : '') +
      '&k=' + (Number(args.topK) || 3);
    const d = await callAPIGet('/api/aura-brain/search?' + qs);
    if (d.error) return 'Error: ' + d.error;
    const results = d.results || [];
    if (!results.length) return 'No AURA box hits for "' + args.query + '". Try rag_search for the big brain, or ingest a source first (aura_ingest).';
    let out = results.map((r, i) =>
      '[' + (i + 1) + '] box=' + r.box + ' [score: ' + r.score + ']\n' +
      (r.title ? r.title + '\n' : '') +
      r.snippet + (r.sourceUrl ? '\n(S) ' + r.sourceUrl : '')
    ).join('\n\n');
    out += '\n\n' + (d.quota ? 'ingest quota: ' + d.quota.used + '/' + d.quota.cap + ' used today' : '');
    return out;
  }

  if (name === 'aura_boxes') {
    const d = await callAPIGet('/api/aura-brain/boxes');
    if (d.error) return 'Error: ' + d.error;
    const boxes = d.boxes || [];
    if (!boxes.length) return 'No AURA boxes yet. Teach an agent from a URL with aura_ingest.';
    return 'AURA boxes (' + boxes.length + '):\n' + boxes.map((b) =>
      '• ' + b.boxId + ' [' + b.visibility + '] — ' + (b.title || 'untitled') +
      ' (' + b.chunkCount + ' chunks)' + (b.sourceUrl ? '\n  → ' + b.sourceUrl : '')
    ).join('\n');
  }

  // SHADDAI media engine
  if (name === 'shaddai_media_status') {
    const d = await callAPIGet('/api/media/status');
    if (d.error) return 'Error: ' + d.error;
    if (!d.engineUp) return 'SHADDAI media engine is offline. Start it (backend/media-engine) and try again.';
    const e = d.engine && d.engine.engine;
    return 'SHADDAI media engine ONLINE\n' +
      '  engine: ' + (e ? e.version + ' @ ' + e.url : '?') + '\n' +
      '  services (' + (d.services || []).length + '): ' + (d.services || []).join(', ');
  }

  if (name === 'shaddai_media_fetch') {
    const d = await callAPI('/api/media/fetch', { url: args.url, downloadMode: args.downloadMode || 'auto' });
    if (!d.ok) return 'Error: ' + (d.error || JSON.stringify(d));
    let out = 'Captured: ' + (d.filename || d.status || 'media') + '\n' +
      '  status: ' + d.status + '\n';
    if (d.size) out += '  size: ' + d.size + '\n';
    out += '\nDownload: ' + d.url + '\n(open the download link in a browser to save the file)';
    return out;
  }

  // SHADDAI capture — combined media + web scrape + clipper
  if (name === 'shaddai_capture') {
    const mode = String(args.mode || '').trim().toLowerCase();
    const url = String(args.url || '').trim();
    if (!url) return 'Provide a url to capture.';
    const d = await callAPI('/api/capture/run', {
      mode, url,
      downloadMode: args.downloadMode || 'auto',
      max_chars: Number(args.max_chars) || undefined,
      clipper_path: args.clipper_path || undefined,
      payload: args.payload || undefined
    });
    if (!d.ok) return 'Capture ' + mode + ' failed: ' + (d.error || JSON.stringify(d));
    if (mode === 'media') {
      let out = 'Captured (media): ' + (d.filename || d.status || '') + '\n';
      if (d.size) out += '  size: ' + d.size + ' B\n';
      return out + '  Download: ' + d.url;
    }
    if (mode === 'clip') {
      return 'Clipper replied (HTTP ' + d.status + '):\n' + String(d.engine || '').slice(0, 2000);
    }
    let out = 'Scraped: ' + (d.title || d.url) + '\n';
    if (d.description) out += '  ' + d.description + '\n';
    out += '  chars: ' + d.chars + ' · links: ' + (d.links || []).length + '\n';
    out += '\n' + String(d.markdown || d.text || '').slice(0, 4000);
    return out;
  }

  // Specialist / agent runs
  const spec = SPECIALISTS.find(s => name === 'shaddai_' + s.key);
  if (spec) {
    const d = await callAPI('/api/agentic/run', { agent: spec.agent, task: args.task });
    if (d.error) return 'Error: ' + d.error;
    const tools = d.toolsUsed && d.toolsUsed.length ? '[tools used: ' + d.toolsUsed.join(', ') + ']\n\n' : '';
    return tools + (d.response || '');
  }

  // Money pillar
  if (name === 'shaddai_create_agent') {
    const d = await callAPI('/api/policy/agent', {
      name: args.name,
      daily_cap_usd: args.daily_cap_usd,
      per_call_cap_usd: args.per_call_cap_usd,
      allowed_tools: args.allowed_tools,
    });
    if (!d.ok || !d.agent) return 'Error: ' + (d.error || JSON.stringify(d));
    const a = d.agent;
    return 'Created agent → ' + fmtAgentLine(a) +
      '\n\nIt can pay/trade only inside these caps and runs on the user\'s OWN API key (Shaddai does not host inference). ' +
      'Revoke anytime with shaddai_revoke_agent. Every move is in the public ledger (shaddai_get_agent_ledger).';
  }

  if (name === 'shaddai_set_spend_policy') {
    const d = await callAPI('/api/policy/agent/' + args.id, {
      daily_cap_usd: args.daily_cap_usd,
      per_call_cap_usd: args.per_call_cap_usd,
      allowed_tools: args.allowed_tools,
    }, 'PUT');
    if (!d.ok || !d.agent) return 'Error: ' + (d.error || JSON.stringify(d));
    return 'Updated policy → ' + fmtAgentLine(d.agent);
  }

  if (name === 'shaddai_revoke_agent') {
    const d = await callAPI('/api/policy/agent/' + args.id + '/revoke', {});
    if (!d.ok) return 'Error: ' + (d.error || JSON.stringify(d));
    return 'REVOKED agent ' + d.agent + ' (revoked=' + d.revoked + '). It can no longer spend or run. Recorded in the public ledger.';
  }

  if (name === 'shaddai_get_agent_ledger') {
    const recs = args.id
      ? (await callAPIGet('/api/policy/agent/' + args.id + '/ledger')).records || []
      : (await callAPIGet('/api/policy/ledger')).ledger || [];
    const label = args.id ? ' for agent ' + args.id : ' (public)';
    return 'Ledger' + label + ' (' + (recs.length || 0) + ' entries):\n' + fmtLedger(recs);
  }

  // ── ZEROX pillar — Virtuals ACP ───────────────────────────────────────────
  if (name === 'zerox_virtuals_me') {
    const err = vkeyRequired(); if (err) return 'Error: ' + err;
    const d = await vApi('/acp/me');
    const httpErr = vHttpError(d, 'agent may not be registered yet — activate it at https://app.virtuals.io/acp/agents (Settings → Generate API).');
    if (httpErr) return 'Error: ' + httpErr;
    if (d.error) return 'Error: ' + d.error;
    const info = unwrapV(d);
    const lines = [
      'Virtuals ACP identity (' + VIRTUALS_ACP_BASE + '):',
      '• agent: ' + (info.agent || info.agentId || info.name || info.id || '?'),
      '• wallet: ' + (info.walletAddress || info.wallet || '?'),
      '• status: ' + (info.status || (d.empty ? 'empty reply (agent may not be registered)' : 'ok')),
    ];
    Object.keys(info).forEach((k) => {
      if (!['agent', 'agentId', 'name', 'id', 'walletAddress', 'wallet', 'status'].includes(k)) {
        lines.push('• ' + k + ': ' + (typeof info[k] === 'object' ? JSON.stringify(info[k]) : info[k]));
      }
    });
    if (d.empty) lines.push('\nTip: register the agent at https://app.virtuals.io/acp/agents (Settings → Generate API) then retry.');
    return lines.join('\n');
  }

  if (name === 'zerox_virtuals_agent') {
    try {
      const r = await fetch(VIRTUALS_ACPX_BASE + '/api/agents/' + encodeURIComponent(String(args.id)) + '/details', { method: 'GET', signal: AbortSignal.timeout(60000) });
      const txt = await r.text();
      const d = txt ? JSON.parse(txt) : {};
      const info = d.data || d.details || d;
      const lines = ['Virtuals agent ' + args.id + ':'];
      if (!info || (d.error && !info.name)) return 'No details for agent ' + args.id + '. ' + ((d.error && d.error.message) || (d.statusCode && 'HTTP ' + d.statusCode) || '');
      lines.push('• name: ' + (info.name || '?'));
      if (info.description) lines.push('• description: ' + info.description.slice(0, 400));
      if (info.tokenSymbol) lines.push('• token: ' + info.tokenSymbol);
      if (info.walletAddress) lines.push('• wallet: ' + info.walletAddress);
      const offeringStr = Array.isArray(info.offerings)
        ? info.offerings.map((o) => '- ' + (o.name || o.jobOfferingName || o.title || '?') + (o.feeUsd ? ' ($' + o.feeUsd + ')' : '')).join('\n')
        : (info.offerings ? JSON.stringify(info.offerings).slice(0, 400) : '');
      if (offeringStr) lines.push('\nOfferings:\n' + offeringStr);
      return lines.join('\n');
    } catch (e) {
      return 'Error: ' + ((e && e.message) || e);
    }
  }

  if (name === 'zerox_virtuals_job') {
    const err = vkeyRequired(); if (err) return 'Error: ' + err;
    let req = {};
    try { req = args.requirements ? JSON.parse(args.requirements) : {}; }
    catch (_) { return 'Error: "requirements" must be valid JSON, e.g. {"query":"AI agents"}.'; }
    const d = await vApi('/acp/jobs', 'POST', {
      providerWalletAddress: args.provider_wallet,
      jobOfferingName: args.offering,
      serviceRequirements: req,
      isAutomated: args.automated !== false,
    });
    const httpErr = vHttpError(d, 'unauthorized or unknown offering — check VIRTUALS_API_KEY / provider wallet / offering name.');
    if (httpErr) return 'Error: ' + httpErr;
    if (d.error) return 'Error: ' + d.error;
    const job = unwrapV(d);
    const jobId = job.jobId || job.id || (job.data && job.data.jobId);
    if (!jobId) return 'Error creating job: ' + JSON.stringify(d).slice(0, 400);
    const phase = job.phase || (job.data && job.data.phase) || undefined;
    return 'Job created → id: ' + jobId +
      (phase ? ' | phase: ' + phase : '') +
      '\n\nPoll with zerox_virtuals_job_status (job_id=' + jobId + ') until COMPLETED / REJECTED / EXPIRED. Payments handled by ACP escrow.';
  }

  if (name === 'zerox_virtuals_job_status') {
    const err = vkeyRequired(); if (err) return 'Error: ' + err;
    const d = await vApi('/acp/jobs/' + encodeURIComponent(String(args.job_id)));
    const httpErr = vHttpError(d, 'job not found or agent unavailable.');
    if (httpErr) return 'Error: ' + httpErr;
    if (d.error) return 'Error: ' + d.error;
    const job = unwrapV(d);
    const phase = job.phase || (job.data && job.data.phase) || 'unknown';
    const lines = ['Job ' + args.job_id + ' — phase: ' + phase];
    if (job.deliverable != null) lines.push('\nDeliverable:\n' + (typeof job.deliverable === 'object' ? JSON.stringify(job.deliverable).slice(0, 1200) : String(job.deliverable).slice(0, 1200)));
    if (Array.isArray(job.memoHistory) && job.memoHistory.length) {
      lines.push('\nMemo history:');
      job.memoHistory.slice(0, 8).forEach((m) => lines.push('- [' + (m.phase || '') + '] ' + ((m.memo || m.message || '')).slice(0, 200)));
    }
    if (['COMPLETED', 'REJECTED', 'EXPIRED'].includes(String(phase).toUpperCase())) {
      lines.push('\nTerminal phase reached — no further polling needed.');
    }
    return lines.join('\n');
  }

  if (name === 'zerox_virtuals_terminal_log') {
    const err = vkeyRequired(); if (err) return 'Error: ' + err;
    try {
      const tok = await fetch(VIRTUALS_TERMINAL_BASE + '/api/accesses/tokens', {
        method: 'POST', headers: { 'X-API-KEY': VIRTUALS_KEY }, signal: AbortSignal.timeout(60000),
      });
      const tokJson = await tok.json().catch(() => ({}));
      const accessToken = (tokJson.data && tokJson.data.accessToken) || tokJson.accessToken;
      if (!accessToken) return 'Error: could not mint a Terminal access token (' + tok.status + '). Agent may not be on the G.A.M.E./Terminal framework.';
      const r = await fetch('https://api-terminal.virtuals.io/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify({
          data: {
            framework_name: args.framework || 'game',
            category_name: args.category || 'general',
            title: String(args.title).slice(0, 255),
            body: String(args.body).slice(0, 2000),
          },
        }),
      });
      if (r.ok || r.status === 201) {
        // Mirror the activity to the Virtuals Telegram bot/channel (separate
        // from the trading bot) so ZEROX's onchain activity is visible in TG too.
        const vFeed = await ecoTelegram.vPost('*' + args.title.slice(0, 60) + '*\n' + String(args.body).slice(0, 900));
        return 'Activity logged to Virtuals Terminal ✓' + (vFeed.error ? ' (TG mirror: ' + vFeed.error + ')' : ' (TG mirror sent)');
      }
      return 'Log failed: HTTP ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200);
    } catch (e) {
      return 'Error: ' + ((e && e.message) || e);
    }
  }

  // ── ZEROX pillar — live markets ────────────────────────────────────────────
  if (name === 'zerox_market_scan') {
    try {
      const gate = paywallGate('zerox_market_scan', args.user_id);
      if (gate) return gate;
      const [mkts, fng] = await Promise.all([
        cgMarkets(),
        fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(60000) }).then((r) => r.json()).catch(() => null),
      ]);
      if (!mkts.length) return 'Error: no market data returned from CoinGecko.';
      const mood = fng && fng.data && fng.data[0];
      const sorted = mkts.slice().sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
      const gainers = sorted.slice(0, 5);
      const losers = sorted.slice(-5).reverse();
      const bigVol = mkts.slice().sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0)).slice(0, 5);
      const fmt = (c) => (c.symbol || c.id).toUpperCase() + ' ' + zxMoney(c.current_price) + ' (' + (c.price_change_percentage_24h >= 0 ? '+' : '') + (c.price_change_percentage_24h || 0).toFixed(2) + '%)';
      const lines = ['ZEROX market scan — climate: ' + (mood ? mood.value + '/100 ' + mood.value_classification : 'n/a')];
      lines.push('\n🔥 Top gainers (24h):\n' + gainers.map(fmt).join('\n'));
      lines.push('\n🧊 Top losers (24h):\n' + losers.map(fmt).join('\n'));
      lines.push('\n📊 Highest volume:\n' + bigVol.map((c) => (c.symbol || '').toUpperCase() + ' — $' + Math.round((c.total_volume || 0) / 1e6) + 'M vol').join('\n'));
      if (mood) lines.push('\nSentiment read: ' + mood.value_classification + ' (' + mood.value + '/100). ' + (Number(mood.value) >= 70 ? 'Greed favors taking profits.' : Number(mood.value) <= 30 ? 'Fear can favor accumulation.' : 'Neutral — let size come from edge, not mood.'));
      return lines.join('\n');
    } catch (e) { return 'Error: ' + ((e && e.message) || e); }
  }

  if (name === 'zerox_price') {
    const gate = paywallGate('zerox_price', args.user_id);
    if (gate) return gate;
    const syms = String(args.symbols || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);
    if (!syms.length) return 'Error: pass symbols like "BTC,SOL" or a Solana mint.';
    const rows = [];
    for (const s of syms) {
      try {
        const p = await cachedPrice(s);
        if (!p) { rows.push('• ' + s + ': unknown symbol/mint (try BTC, ETH, SOL, WIF, or a 44-char Solana mint)'); continue; }
        rows.push('• ' + p.name + ' : ' + zxMoney(p.price) + ' (' + (p.change24h >= 0 ? '+' : '') + p.change24h.toFixed(2) + '% 24h) [' + p.source + ']');
      } catch (e) { rows.push('• ' + s + ': error (' + ((e && e.message) || e) + ')'); }
    }
    return 'ZEROX live prices:\n' + rows.join('\n');
  }

  if (name === 'zerox_sentiment') {
    try {
      const gate = paywallGate('zerox_sentiment', args.user_id);
      if (gate) return gate;
      const fng = await fetch('https://api.alternative.me/fng/?limit=2', { signal: AbortSignal.timeout(60000) }).then((r) => r.json()).catch(() => null);
      if (!fng || !fng.data || !fng.data.length) return 'Error: Fear & Greed index unavailable.';
      const now = fng.data[0];
      const prev = fng.data[1];
      const delta = prev ? Number(now.value) - Number(prev.value) : 0;
      const guidance = Number(now.value) >= 70 ? 'Greed — good time to take profits, size down new buys.' : Number(now.value) <= 30 ? 'Fear — historically better risk/reward for accumulation.' : 'Neutral — rely on edge, not mood.';
      return 'Fear & Greed: ' + now.value + '/100 — ' + now.value_classification +
        (delta ? ' (' + (delta >= 0 ? '+' : '') + delta + ' vs yesterday)' : '') +
        '\nRead: ' + guidance;
    } catch (e) { return 'Error: ' + ((e && e.message) || e); }
  }

  // ── ZEROX pillar — commissions & fees ──────────────────────────────────────
  if (name === 'zerox_commission_rate') {
    const db = zxRead(ZX_COMMISSIONS_FILE, zxCommDefault());
    if (args.rate !== undefined) {
      const r = Math.min(1, Math.max(0, zxNum(args.rate, zxCommDefault().rate)));
      db.rate = r; db.updated = zxNow();
      if (!zxWrite(ZX_COMMISSIONS_FILE, db)) return 'Error: could not persist commission rate.';
      return 'ZEROX commission rate set to ' + Math.round(r * 100) + '%. Every new deal you route keeps ' + zxMoney(1000 * r) + ' per $1,000 of gross.';
    }
    return 'ZEROX current commission rate: ' + Math.round((db.rate || 0) * 100) + '% (keeps ' + zxMoney(1000 * (db.rate || 0)) + ' per $1,000 routed).\nSet a new rate: zerox_commission_rate rate=0.15';
  }

  if (name === 'zerox_record_deal') {
    const gross = zxNum(args.gross_usd, NaN);
    if (!isFinite(gross) || gross <= 0) return 'Error: gross_usd must be a positive number.';
    const db = zxRead(ZX_COMMISSIONS_FILE, zxCommDefault());
    const fee = args.flat_usd !== undefined ? zxNum(args.flat_usd, 0) : gross * (db.rate || 0);
    const deal = {
      id: 'D' + Date.now(),
      date: zxNow(),
      counterparty: String(args.counterparty || 'unknown'),
      service: String(args.service || 'service'),
      venue: String(args.venue || 'acp'),
      gross_usd: Math.round(gross * 100) / 100,
      commission_usd: Math.round(fee * 100) / 100,
    };
    if (args.escrow_ref) deal.escrow_ref = String(args.escrow_ref);
    db.deals.push(deal);
    if (!zxWrite(ZX_COMMISSIONS_FILE, db)) return 'Error: could not persist commission ledger.';
    const totalFees = db.deals.reduce((s, d) => s + d.commission_usd, 0);
    const totalGross = db.deals.reduce((s, d) => s + d.gross_usd, 0);
    return 'Deal recorded → ' + deal.id + '\n• ' + deal.service + ' with ' + deal.counterparty + ' (' + deal.venue + ')' +
      '\n• gross ' + zxMoney(deal.gross_usd) + ' → ZEROX takes ' + zxMoney(deal.commission_usd) +
      (deal.escrow_ref ? '\n• escrow ref: ' + deal.escrow_ref : '') +
      '\n\nRunning totals: ' + zxMoney(totalGross) + ' gross routed · ' + zxMoney(totalFees) + ' commissions taken';
  }

  if (name === 'zerox_commissions') {
    const db = zxRead(ZX_COMMISSIONS_FILE, zxCommDefault());
    const deals = db.deals || [];
    const totalGross = deals.reduce((s, d) => s + d.gross_usd, 0);
    const totalFees = deals.reduce((s, d) => s + d.commission_usd, 0);
    const byVenue = {};
    deals.forEach((d) => {
      byVenue[d.venue] = byVenue[d.venue] || { gross: 0, fees: 0, count: 0 };
      byVenue[d.venue].gross += d.gross_usd;
      byVenue[d.venue].fees += d.commission_usd;
      byVenue[d.venue].count += 1;
    });
    const lines = ['ZEROX commission ledger — rate ' + Math.round((db.rate || 0) * 100) + '%'];
    lines.push('• deals: ' + deals.length);
    lines.push('• gross routed: ' + zxMoney(totalGross));
    lines.push('• ZEROX commissions taken: ' + zxMoney(totalFees));
    if (Object.keys(byVenue).length) {
      lines.push('\nBy venue:');
      Object.keys(byVenue).forEach((v) => lines.push('• ' + v + ': ' + byVenue[v].count + ' deals, ' + zxMoney(byVenue[v].fees) + ' fees on ' + zxMoney(byVenue[v].gross)));
    }
    if (deals.length) {
      lines.push('\nLatest:');
      deals.slice(-10).reverse().forEach((d) => lines.push('• [' + d.id + '] ' + d.service + ' · ' + d.counterparty + ' · gross ' + zxMoney(d.gross_usd) + ' → fee ' + zxMoney(d.commission_usd)));
    }
    return lines.join('\n');
  }

  // ── ZEROX pillar — paper trading (simulated, no real funds) ────────────────
  if (name === 'zerox_paper_open') {
    const acct = String(args.account || 'main');
    const db = zxRead(ZX_PAPER_FILE, zxPaperDefault());
    const acc = db.accounts[acct] || (db.accounts[acct] = { cash: 10000, positions: [], trades: [] });
    const quote = await cachedPrice(String(args.symbol || '').trim()).catch(() => null);
    if (!quote || !isFinite(quote.price) || quote.price <= 0) return 'Error: could not get a live price for "' + args.symbol + '" (known symbols: ' + Object.keys(CG_SYM).join(', ') + ' + Solana mints).';
    const side = String(args.side || 'buy').toLowerCase() === 'sell' ? 'sell' : 'buy';
    let qty = zxNum(args.qty, 0);
    if (qty <= 0) {
      const conf = Math.min(1, Math.max(0, zxNum(args.confidence, 0.5)));
      const kelly = Math.max(0, (2 * conf - 1)) * 0.5;
      const frac = Math.min(0.25, kelly || 0.25);
      qty = (acc.cash * frac) / quote.price;
    }
    const cost = qty * quote.price;
    if (cost > acc.cash) return 'Error: notional ' + zxMoney(cost) + ' exceeds available cash ' + zxMoney(acc.cash) + '. Smaller qty or deposit more paper capital.';
    acc.cash -= cost;
    const pos = { id: 'PX' + Date.now(), symbol: quote.name, side, qty, entry: quote.price, opened: zxNow() };
    acc.positions.push(pos);
    if (!zxWrite(ZX_PAPER_FILE, db)) { acc.cash += cost; acc.positions = acc.positions.filter((p) => p.id !== pos.id); return 'Error: could not persist paper account.'; }
    return 'Paper ' + side + ' opened → ' + pos.id + '\n• ' + quote.name + ' @ ' + zxMoney(pos.entry) + ' × ' + qty.toFixed(6) + '\n• notional ' + zxMoney(cost) + (side === 'buy' ? ' (cash now ' + zxMoney(acc.cash) + ')' : ' (short — margin locked ' + zxMoney(cost) + ')') +
      '\n\nReal P&L when closed: zerox_paper_close position_id=' + pos.id;
  }

  if (name === 'zerox_paper_close') {
    const acct = String(args.account || 'main');
    const db = zxRead(ZX_PAPER_FILE, zxPaperDefault());
    const acc = db.accounts[acct];
    if (!acc || !(acc.positions || []).length) return 'Error: no open positions in account "' + acct + '".';
    const want = String(args.position_id || '');
    let idx;
    if (want) idx = acc.positions.findIndex((p) => p.id === want);
    else if (args.symbol) idx = acc.positions.findIndex((p) => p.symbol.toLowerCase() === String(args.symbol).toLowerCase().trim());
    if (idx < 0) return 'Error: no matching position (use position_id from zerox_paper_open, or a symbol with an open position).';
    const pos = acc.positions[idx];
    const quote = await cachedPrice(pos.symbol).catch(() => null);
    if (!quote || !isFinite(quote.price) || quote.price <= 0) return 'Error: could not price ' + pos.symbol + ' to close.';
    let qty = zxNum(args.qty, 0);
    if (qty <= 0 || qty > pos.qty) qty = pos.qty;
    const exit = quote.price;
    const pnl = (exit - pos.entry) * qty * (pos.side === 'buy' ? 1 : -1);
    acc.cash += qty * exit;
    const trade = { id: pos.id, symbol: pos.symbol, side: pos.side, qty, entry: pos.entry, exit, pnl, closed: zxNow() };
    acc.trades.push(trade);
    if (qty >= pos.qty) acc.positions.splice(idx, 1); else pos.qty -= qty;
    if (!zxWrite(ZX_PAPER_FILE, db)) return 'Error: could not persist paper account.';
    const equity = acc.cash;
    return 'Paper close → ' + trade.id + '\n• ' + pos.symbol + ' ' + pos.side + ' filled ' + qty.toFixed(6) + ' @ ' + zxMoney(exit) + ' (entry ' + zxMoney(trade.entry) + ')\n• realized P&L: ' + (pnl >= 0 ? '+' : '') + zxMoney(pnl) +
      (trade.pnl >= 0 ? ' 🎉' : '') + '\n• cash ' + zxMoney(acc.cash) + ' · equity ' + zxMoney(equity) + ' | positions left: ' + acc.positions.length;
  }

  if (name === 'zerox_paper_portfolio') {
    const acct = String(args.account || 'main');
    const db = zxRead(ZX_PAPER_FILE, zxPaperDefault());
    const acc = db.accounts[acct];
    if (!acc) return 'Error: no account "' + acct + '".';
    const realized = acc.trades.reduce((s, t) => s + t.pnl, 0);
    const wins = acc.trades.filter((t) => t.pnl > 0).length;
    const lines = ['ZEROX paper account "' + acct + '" — cash ' + zxMoney(acc.cash) + ' · realized P&L ' + (realized >= 0 ? '+' : '') + zxMoney(realized) +
      (acc.trades.length ? ' · win rate ' + Math.round((wins / acc.trades.length) * 100) + '% (' + wins + '/' + acc.trades.length + ')' : '')];
    if (!acc.positions.length) { lines.push('\nNo open positions. Open one: zerox_paper_open symbol=BTC'); return lines.join('\n'); }
    const priced = await Promise.all(acc.positions.map(async (p) => ({ p, q: await cachedPrice(p.symbol).catch(() => null) })));
    let equity = acc.cash;
    lines.push('\nOpen positions:');
    for (const { p, q } of priced) {
      const mark = q && isFinite(q.price) ? q.price : p.entry;
      const upnl = (mark - p.entry) * p.qty * (p.side === 'buy' ? 1 : -1);
      equity += p.qty * mark;
      lines.push('• ' + p.id + ' ' + p.symbol + ' ' + p.side.toUpperCase() + ' ' + p.qty.toFixed(6) + ' @ ' + zxMoney(p.entry) + ' → mark ' + zxMoney(mark) + ' | unrealized ' + (upnl >= 0 ? '+' : '') + zxMoney(upnl));
    }
    lines.push('\nEquity (cash + mark-to-market, incl. realized P&L): ' + zxMoney(equity));
    return lines.join('\n');
  }

  if (name === 'zerox_paper_weekly') {
    const acct = String(args.account || 'main');
    const db = zxRead(ZX_PAPER_FILE, zxPaperDefault());
    const acc = db.accounts[acct];
    if (!acc || !(acc.trades || []).length) return 'Weekly report for "' + acct + '": no closed trades yet this week.';
    const weeks = {};
    acc.trades.forEach((t) => {
      const w = zxIsoWeek(t.closed);
      weeks[w] = (weeks[w] || 0) + t.pnl;
    });
    const sorted = Object.keys(weeks).sort().reverse();
    const thisWeek = sorted[0];
    const lastWeek = sorted[1];
    const lines = ['ZEROX paper weekly report — account "' + acct + '"'];
    lines.push('• ' + thisWeek + ': ' + (weeks[thisWeek] >= 0 ? '+' : '') + zxMoney(weeks[thisWeek]) + (lastWeek ? ' (prev ' + (weeks[lastWeek] >= 0 ? '+' : '') + zxMoney(weeks[lastWeek]) + ')' : ''));
    const weekTrades = acc.trades.filter((t) => zxIsoWeek(t.closed) === thisWeek);
    if (weekTrades.length) {
      const best = weekTrades.reduce((a, b) => (b.pnl > a.pnl ? b : a));
      const worst = weekTrades.reduce((a, b) => (b.pnl < a.pnl ? b : a));
      lines.push('• best: ' + best.symbol + ' ' + zxMoney(best.pnl) + ' (' + best.id + ')');
      lines.push('• worst: ' + worst.symbol + ' ' + zxMoney(worst.pnl) + ' (' + worst.id + ')');
      lines.push('• closed this week: ' + weekTrades.length + ' trades');
    }
    return lines.join('\n');
  }

  // ── ZEROX pillar — on-chain wallet watch ───────────────────────────────────
  if (name === 'zerox_wallet_status') {
    const lines = ['ZEROX — SHADDAI agent wallets (read-only):'];
    if (!VIRTUALS_BASE_WALLET && !VIRTUALS_SOL_WALLET) {
      lines.push('\nNo wallets configured. Set VIRTUALS_BASE_WALLET and/or VIRTUALS_SOL_WALLET in the MCP env (they auto-load from Shaddai/backend/.env).');
    }
    if (VIRTUALS_BASE_WALLET) {
      try {
        const r = await fetch('https://mainnet.base.org', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [VIRTUALS_BASE_WALLET, 'latest'] }), signal: AbortSignal.timeout(60000) });
        const j = await r.json();
        const eth = Number(j.result || '0x0') / 1e18;
        lines.push('• Base (ACP provider) ' + VIRTUALS_BASE_WALLET.slice(0, 6) + '…' + VIRTUALS_BASE_WALLET.slice(-4) + ':\n    ETH ' + eth.toFixed(6) + (eth < 0.001 ? ' — UNFUNDED: no gas → ACP escrow/trades blocked until you send a little ETH to this wallet.' : ' — funded ✓ can sign ACP transactions.'));
      } catch (e) { lines.push('• Base provider: query failed (' + ((e && e.message) || e) + ')'); }
    } else lines.push('• Base (ACP provider): not configured.');
    if (VIRTUALS_SOL_WALLET) {
      try {
        const r = await fetch('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [VIRTUALS_SOL_WALLET] }), signal: AbortSignal.timeout(60000) });
        const j = await r.json();
        const sol = (j.result && j.result.value != null ? j.result.value : 0) / 1e9;
        lines.push('• Solana agent wallet ' + VIRTUALS_SOL_WALLET.slice(0, 4) + '…' + VIRTUALS_SOL_WALLET.slice(-4) + ':\n    SOL ' + sol.toFixed(6) + (sol < 0.001 ? ' — UNFUNDED: 0 SOL (RPC shows no funds). Send a little SOL (rent + gas) before any on-chain move.' : ' — funded ✓'));
      } catch (e) { lines.push('• Solana wallet: query failed (' + ((e && e.message) || e) + ')'); }
    } else lines.push('• Solana agent wallet: not configured.');
    lines.push('\nNo funds are ever moved by this tool — it only reads balances so you know when gas/funding exists.');
    return lines.join('\n');
  }

  // ── HALL pillar — the SHADDAI economy ──────────────────────────────────────
  if (name === 'forge_spawn_sub') {
    const sub = ecoSubagents.spawnSubAgent({ parent_id: args.parent_id, role: args.role, name: args.name, tools: args.tools, takes_usd: args.takes_usd });
    if (sub.error) return 'Error: ' + sub.error;
    return 'Sub-agent spawned → ' + sub.id + '\n• role: ' + sub.role + ' · name: ' + sub.name + '\n• parent: ' + sub.parent_id + ' · tools: ' + (sub.tools.length ? sub.tools.join(', ') : 'unrestricted') + '\n• takes: ' + zxMoney(sub.takes_usd) + ' per-task attribution · status ' + sub.status + '\n\nDelegate work: forge_delegate sub_id=' + sub.id + ' tasks=["..."]';
  }

  if (name === 'forge_delegate') {
    const w = ecoSubagents.delegate({ sub_id: args.sub_id, tasks: args.tasks, est_usd: args.est_usd });
    if (w.error) return 'Error: ' + w.error;
    return 'Batch queued → ' + w.id + ' (sub ' + w.sub_id + ')\n• ' + w.tasks.length + ' tasks:\n' + w.tasks.map((t, i) => '  ' + (i + 1) + '. ' + t).join('\n') + '\n• expected attribution: ' + zxMoney(w.expected_usd) + '\n\nComplete it: forge_complete_work work_id=' + w.id + ' results={...}';
  }

  if (name === 'forge_complete_work') {
    const done = ecoSubagents.complete(args.work_id, args.results);
    if (done.error) return 'Error: ' + done.error;
    return 'Work ' + done.id + ' → ' + done.status + '\n• tasks: ' + done.tasks.length + ' · sub credited: ' + done.sub_id + ' (' + zxMoney(done.expected_usd) + ')\n• results: ' + JSON.stringify(done.results).slice(0, 400);
  }

  if (name === 'forge_sub_status') {
    const st = ecoSubagents.stats(args.parent_id);
    if (st.sub_count === 0) return 'No sub-agents under ' + args.parent_id + ' yet. Spawn one: forge_spawn_sub parent_id=' + args.parent_id + ' role=scanner';
    const lines = ['Delegation stats for ' + args.parent_id + ':'];
    lines.push('• sub-agents: ' + st.sub_count + ' · calls done: ' + st.total_calls + ' · earned attribution: ' + zxMoney(st.total_earned_usd) + ' · queued batches: ' + st.queued);
    if (args.detail) {
      ecoSubagents.ofParent(args.parent_id).forEach((s) => {
        lines.push('\n[' + s.id + '] ' + s.name + ' (' + s.role + ') · ' + s.status + ' · calls ' + s.calls_done + ' · earned ' + zxMoney(s.earned_usd));
        ecoSubagents.bySub(s.id).forEach((w) => lines.push('   ↳ ' + w.id + ' [' + w.status + '] ' + w.tasks.length + ' tasks' + (w.completed_at ? ' · done ' + new Date(w.completed_at).toISOString().slice(0, 16) : '')));
      });
    }
    return lines.join('\n');
  }

  if (name === 'directory_register') {
    const inst = ecoDirectory.register({ id: args.id, templateId: args.templateId, name: args.name, owner: args.owner, description: args.description, pricesUsdc: args.prices_usdc, status: args.status });
    if (inst.error) return 'Error: ' + inst.error;
    const prices = Object.keys(inst.pricesUsdc).length ? Object.keys(inst.pricesUsdc).map((k) => k + '=' + zxMoney(inst.pricesUsdc[k])).join(', ') : 'none set';
    return 'Office published to Office Avenue → ' + inst.id + '\n• ' + inst.name + ' (' + inst.templateName + ') · owner ' + inst.owner + ' · ' + inst.status + '\n• services: ' + inst.services.join(', ') + '\n• prices: ' + prices + '\n• MCP: ' + inst.mcpEndpoint;
  }

  if (name === 'directory_search') {
    const res = args.template ? ecoDirectory.byTemplate(args.template) : ecoDirectory.search(args.q);
    if (!res.length) return 'No offices found' + (args.q ? ' for "' + args.q + '"' : '') + (args.template ? ' under ' + args.template : '') + '.\n\nTemplates available: ' + ecoDirectory.TEMPLATES.map((t) => t.id).join(', ');
    const lines = ['Office Avenue — ' + res.length + ' live office(s):'];
    res.slice(0, 20).forEach((i) => {
      const prices = Object.keys(i.pricesUsdc).length ? Object.keys(i.pricesUsdc).map((k) => k + ' ' + zxMoney(i.pricesUsdc[k])).join(' · ') : 'prices n/a';
      lines.push('\n• [' + i.templateName + '] ' + i.name + ' — @' + i.owner + ' · ' + i.calls + ' calls\n  ' + i.services.join(', ') + ' — ' + prices + (i.description ? '\n  ' + i.description.slice(0, 140) : ''));
    });
    return lines.join('\n');
  }

  if (name === 'directory_list') {
    const lines = ['Forgeable office templates (one hall, seven offices):'];
    ecoDirectory.TEMPLATES.forEach((t) => lines.push('\n• ' + t.id + ' · ' + t.name + ' — ' + t.desc + '\n  services: ' + t.services.join(', ') + ' · accent ' + t.accent));
    lines.push('\nPublish a forged office: directory_register id=... templateId=... name=... owner=... prices_usdc={"tool":0.5}');
    return lines.join('\n');
  }

  if (name === 'graph_log_discovery') {
    const rec = ecoDiscoveries.logDiscovery({ agent_id: args.agent_id, type: args.type, target: args.target, reason: args.reason, confidence: args.confidence, was_correct: args.was_correct });
    if (rec.error) return 'Error: ' + rec.error;
    return 'Collective-memory finding logged → ' + rec.id + ' (' + rec.type + ')\n• ' + rec.agent_id + ' flags ' + (rec.target || '—') + ' @ ' + Math.round(rec.confidence * 100) + '% confidence\n• ' + rec.reason + '\n\nOther agents see it: graph_context target=' + (rec.target || '...');
  }

  if (name === 'graph_context') {
    const gate = paywallGate('graph_context', args.user_id);
    if (gate) return gate;
    const hits = ecoDiscoveries.contextual(args.target);
    if (!hits.length) return 'No collective-memory findings on "' + args.target + '" yet. Log the first one: graph_log_discovery agent_id=... type=rug_warning target=' + args.target + ' reason=...';
    const lines = ['Collective memory for "' + args.target + '" — ranked by reputation (' + hits.length + ' findings):'];
    hits.slice(0, 15).forEach((d) => lines.push('\n[' + d.id + '] ' + d.type + ' by ' + d.agent_id + ' · conf ' + Math.round(d.confidence * 100) + '% · rep ' + d.rep_score + ' · ' + d.cites.length + ' cites\n  ' + (d.reason || '').slice(0, 180)));
    return lines.join('\n');
  }

  if (name === 'graph_neighbors') {
    const n = ecoGraph.neighborhood(args.id, args.depth);
    if (!n.length) return 'Entity not found: ' + args.id;
    const lines = ['Graph neighborhood of ' + args.id + ':'];
    n.forEach((x) => lines.push((x.depth ? '  '.repeat(Math.min(x.depth, 4)) + '└─ ' : '• ') + x.id + (x.entity ? ' (' + x.entity.name + ')' : '') + (x.via ? '  via [' + x.via.relation + ']' : '')));
    return lines.join('\n');
  }

  if (name === 'ledger_receipt') {
    const r = ecoLedger.logReceipt({ instance_id: args.instance_id, caller: args.caller, tool: args.tool, amount_usdc: args.amount_usdc, note: args.note });
    if (r.error) return 'Error: ' + r.error;
    return 'Receipt logged → ' + r.id + '\n• ' + r.tool + ' on ' + r.instance_id + ' · paid by ' + r.caller + '\n• gross ' + zxMoney(r.amount_usdc) + ' → owner keeps ' + zxMoney(r.owner_cut_usdc) + ' · hall takes ' + zxMoney(r.platform_cut_usdc) + ' (' + Math.round(ecoLedger.PLATFORM_CUT * 100) + '%)';
  }

  if (name === 'ledger_summary') {
    const s = ecoLedger.summary();
    const owed = ecoLedger.owed();
    const lines = ['Platform ledger — ' + s.receipts + ' receipts'];
    lines.push('• gross: ' + zxMoney(s.gross));
    lines.push('• hall cut: ' + zxMoney(s.platform_cut) + ' (collects and pays out to owners)');
    lines.push('• owner share: ' + zxMoney(s.owner_share) + ' · paid out: ' + s.payouts_made + ' payouts');
    if (Object.keys(s.per_instance).length) {
      lines.push('\nPer instance:');
      Object.keys(s.per_instance).forEach((id) => {
        const p = s.per_instance[id];
        lines.push('• ' + id + ': ' + p.calls + ' calls · gross ' + zxMoney(p.gross) + ' · owner ' + zxMoney(p.owner) + (owed[id] ? ' → owed ' + zxMoney(owed[id]) : ''));
      });
    }
    return lines.join('\n');
  }

  if (name === 'quota_status') {
    const used = ecoQuota.usageToday(args.user_id);
    const left = Math.max(0, ecoQuota.FREE_TIER_DAILY_CALLS - used);
    return 'Free-tier quota for ' + args.user_id + ': ' + used + '/' + ecoQuota.FREE_TIER_DAILY_CALLS + ' used · ' + left + ' free calls left today.' + (left === 0 ? ' Paid tools now require payment (HTTP 402).' : ' Try-before-you-buy is the doorway to a seat.');
  }

  if (name === 'reputation_status') {
    const r = ecoReputation.derive(args.instance_id);
    const lines = ['Reputation for ' + r.instance_id + ' — tier: ' + r.tier + ' (rep ' + r.reputation + ')'];
    lines.push('• activity: ' + r.activity_calls + ' calls · ' + zxMoney(r.gross_usdc) + ' gross · ' + r.discoveries + ' discoveries');
    if (r.accuracy !== null) lines.push('• accuracy: ' + Math.round(r.accuracy * 100) + '%');
    lines.push('• perks: ' + JSON.stringify(r.perks));
    lines.push('• ' + r.notes);
    return lines.join('\n');
  }

  if (name === 'sched_add') {
    const job = ecoScheduler.add({ type: args.type, data: parseJSON(args.data, {}), every_ms: args.every_ms ? Number(args.every_ms) : undefined, at: args.at, enabled: args.enabled !== false });
    if (job.error) return 'Scheduler: ' + job.error;
    return 'Scheduled ' + job.type + ' → ' + job.id + ' every ' + job.every_ms + 'ms' + (job.at ? ' · first fire ' + job.at : ' · next run now');
  }

  if (name === 'sched_list') {
    const jobs = ecoScheduler.list(args.type);
    if (!jobs.length) return 'No scheduled jobs' + (args.type ? ' for type ' + args.type : '') + '.';
    const lines = jobs.map((j) => '• ' + j.type + ' [' + j.id + (j.enabled ? '' : ' · disabled') + '] every ' + j.every_ms + 'ms · next ' + (j.next_run_at ? new Date(j.next_run_at).toISOString() : 'now') + (j.last_result ? ' · last: ' + String(j.last_result).slice(0, 80) : '') + (j.last_error ? ' · ERR: ' + j.last_error : ''));
    return jobs.length + ' scheduled job(s):\n' + lines.join('\n');
  }

  if (name === 'sched_cancel') {
    const r = ecoScheduler.remove(args.job_id);
    return r.removed ? 'Cancelled job ' + args.job_id + '.' : 'Job not found: ' + args.job_id;
  }

  if (name === 'x402_info') {
    const wallet = process.env.VIRTUALS_SOL_WALLET || '';
    const lines = ['x402 PayBox — Solana USDC rail · receiver ' + (wallet || 'NOT SET (add VIRTUALS_SOL_WALLET to backend/.env)')];
    lines.push('Receipts ledger: ' + ecoLedger.summary().receipts + ' entries · grand gross ' + ecoLedger.summary().gross.toFixed(2) + ' USDC · platform cut 15%');
    lines.push('Paid tools: ' + Object.entries(ecoPaybox.PRICES_USDC).map(([k, v]) => k + '=' + v.toFixed(2) + 'USDC').join(', '));
    lines.push('Paywall enforced: ' + (ECO_PAYWALL ? 'YES — free ' + ecoQuota.FREE_TIER_DAILY_CALLS + '/day then 402' : 'NO — quote-only (set SHADDAI_ENABLE_PAYWALL=1 to enforce)'));
    lines.push('Flow: x402_quote → x402_intent (get solana: link) → pay in USDC wallet → x402_confirm <intent_id> <tx>');
    return lines.join('\n');
  }

  if (name === 'x402_quote') {
    const price = ecoPaybox.quote(args.tool);
    return price > 0 ? 'x402 quote: ' + args.tool + ' = ' + price.toFixed(2) + ' USDC on Solana (memo = intent id; USDC mint EPjFWdd5…). Create intent with x402_intent.' : args.tool + ' is free — no payment needed.';
  }

  if (name === 'x402_intent') {
    const price = ecoPaybox.quote(args.tool);
    if (price <= 0) return args.tool + ' is free — no payment needed.';
    const r = ecoPaybox.createIntent(args.tool, args.user_id || 'anonymous');
    if (r.error) return 'x402: ' + r.error;
    const lines = ['x402 intent ' + r.intent.id + ' for ' + r.intent.tool + ' — ' + r.intent.amount_usdc.toFixed(2) + ' USDC · expires ' + r.intent.expires_at];
    lines.push(r.payment_url ? 'PAY WITH: ' + r.payment_url : 'Payment URL withheld — VIRTUALS_SOL_WALLET not set in backend/.env.');
    lines.push('After paying, run x402_confirm with intent_id=' + r.intent.id + ' and the transaction signature.');
    return lines.join('\n');
  }

  if (name === 'x402_confirm') {
    const r = await ecoPaybox.confirm(args.intent_id, args.tx, ecoLedger);
    return r.ok ? 'PAYMENT VERIFIED ✓ — intent ' + args.intent_id + ' paid ' + r.intent.amount_usdc.toFixed(2) + ' USDC (tx ' + String(r.intent.tx).slice(0, 12) + '…). Receipt logged to the platform ledger.' : 'x402 confirm: ' + r.reason;
  }

  if (name === 'hall_post') {
    const r = await ecoTelegram.post(args.text, args.chat_id);
    if (r.error) return 'hall_post: ' + r.error;
    return 'Posted to @ShaddaiHall (message ' + r.message_id + ').';
  }

  if (name === 'hall_bind') {
    const b = ecoTelegram.bind(args.user_id, args.chat_id);
    return 'Bound ' + args.user_id + ' → chat ' + b.chat_id + '. Their digests and receipts now route here (hall_post defaults to it).';
  }

  if (name === 'plot_status') {
    const plots = ecoPlots.list(args.district);
    if (!plots.length) return 'No plots yet' + (args.district ? ' in ' + args.district : '') + '. Ask to mint the first plots, then claim one with plot_buy.';
    return plots.map((p) => '• ' + p.id + ' · ' + p.name + ' · ' + p.district_name + ' · ' + p.status + (p.owner ? ' · owner ' + p.owner + ' · ' + p.tenants.length + ' tenants' : ' · buy ' + p.price_usdc.toFixed(0) + ' USDC · rent ' + p.monthly_rent_usdc.toFixed(2) + '/mo') + ' · ' + p.visitors + ' visits · ' + p.rent_collected_usdc.toFixed(2) + ' USDC to date').join('\n');
  }

  if (name === 'plot_buy') {
    const p = ecoPlots.buy(args.plot_id, args.owner, args.tx);
    if (p.error) return 'plot_buy: ' + p.error;
    return 'Plot ' + p.id + ' (' + p.name + ', ' + p.district_name + ') purchased by ' + p.owner + ' for ' + p.price_usdc + ' USDC. Digital property registered' + (p.purchase_tx === 'paper' ? ' [paper] — real tx links when funded' : ' (tx ' + p.purchase_tx + ')') + '.';
  }

  if (name === 'mastery_create') {
    const rec = ecoMastery.create({ instance_id: args.instance_id, name: args.name, description: args.description, price_usdc: args.price_usdc, patterns: parseJSON(args.patterns, []), win_rate: args.win_rate ? Number(args.win_rate) : null });
    if (rec.error) return 'mastery_create: ' + rec.error;
    return 'Mastery pack ' + rec.id + ' — "' + rec.name + '" · ' + rec.price_usdc.toFixed(2) + ' USDC · ' + rec.patterns.length + ' patterns · 75% royalty to ' + rec.instance_id;
  }

  if (name === 'mastery_list') {
    const packs = ecoMastery.list(args.instance_id);
    if (!packs.length) return 'No mastery packs' + (args.instance_id ? ' from ' + args.instance_id : '') + ' yet.';
    return packs.map((p) => '• ' + p.id + ' · "' + p.name + '" · ' + p.price_usdc.toFixed(2) + ' USDC · ' + p.sales + ' sales · ' + p.revenue_total_usdc.toFixed(2) + ' USDC earned (75% creator)').join('\n');
  }

  if (name === 'workflow_create') {
    const rec = ecoWorkflows.create({ name: args.name, description: args.description, price_usdc: args.price_usdc, creator: args.creator, steps: parseJSON(args.steps, []), published: args.published === true || args.published === 'true' });
    if (rec.error) return 'workflow_create: ' + rec.error;
    return 'Workflow ' + rec.id + ' "' + rec.name + '" with ' + rec.steps.length + ' steps — ' + rec.status + ' · run with workflow_run';
  }

  if (name === 'workflow_run') {
    const exec = await ecoWorkflows.run(args.workflow_id, parseJSON(args.context, {}));
    if (exec.error) return 'workflow_run: ' + exec.error;
    const lines = [exec.status.toUpperCase() + ' — ' + exec.name + ' (' + exec.steps_completed + '/' + exec.step_results.length + ' steps)'];
    exec.step_results.forEach((s) => lines.push('  step ' + s.step + ' ' + s.tool + ': ' + String(s.output || s.error || '').split('\n')[0].slice(0, 90)));
    return lines.join('\n');
  }

  if (name === 'workflow_list') {
    const wf = ecoWorkflows.list();
    if (!wf.length) return 'No workflows yet. Build one with workflow_create (steps are MCP tool names).';
    return wf.map((w) => '• ' + w.id + ' · "' + w.name + '" · ' + w.status + ' · ' + w.steps.length + ' steps' + (w.price_usdc ? ' · ' + w.price_usdc.toFixed(2) + ' USDC' : '') + (w.requires && w.requires.length ? ' — NEEDS: ' + w.requires.join(' + ') : '')).join('\n');
  }

  if (name === 'bridge_register') {
    const a = ecoBridge.register({ id: args.id, name: args.name, platform: args.platform, url: args.url, tools: parseJSON(args.tools, []), prices_usdc: parseJSON(args.prices_usdc, {}) });
    if (a.error) return 'bridge_register: ' + a.error;
    return 'External agent "' + a.name + '" (' + a.id + ', ' + a.platform + ') live at ' + a.url + ' — https required & confirmed. Split: platform 15% / external 50% / coordination 35%.';
  }

  if (name === 'bridge_call') {
    const r = await ecoBridge.callAgent(args.agent_id, args.tool, parseJSON(args.params, {}));
    if (r.error) return 'bridge_call: ' + r.error;
    return '→ ' + args.agent_id + ' ' + args.tool + ' · HTTP ' + r.status + (r.ok ? '' : ' (failed)') + ' · ' + JSON.stringify(r.result).slice(0, 300) + (r.billing ? ' · billed ' + r.billing.amount_usdc.toFixed(2) + ' USDC (split recorded)' : '');
  }

  if (name === 'hall_gem_profile') return ecoCommunity.profile(args.uid);
  if (name === 'hall_daily_bonus') return ecoCommunity.dailyBonus(args.uid);
  if (name === 'hall_quests') return ecoCommunity.runQuests(args.uid);
  if (name === 'hall_referral') return ecoCommunity.referral(args.uid, args.bot_username);
  if (name === 'hall_claim_referral') return ecoCommunity.claim(args.uid, args.code);
  if (name === 'hall_conviction') return ecoCommunity.convict(args.uid, args.symbol, args.amount);
  if (name === 'hall_hot') return ecoCommunity.hot(args.n);
  if (name === 'hall_leaderboard') return ecoCommunity.leaderboard();
  if (name === 'hall_community_stats') return ecoCommunity.stats();
  if (name === 'hall_arcade') return ecoCommunity.arcade(args.uid, args.game, args.bet);
    if (name === 'hall_arena') return ecoCommunity.arena(args.uid, args.a, args.b, args.bet);
    if (name === 'hall_arena_history') return ecoCommunity.arenaHistory(args.n);
    if (name === 'hall_astro') return ecoCommunity.astro(args.sign);
    if (name === 'hall_music') return ecoCommunity.musicspec(args.genre, args.bars);
    if (name === 'hall_moon') { const m = ecoCommunity.moonPhase(); return m.phase + ' \u{1F319} ' + m.illum + '% lit'; }
    if (name === 'hall_rag_nav') return ecoBrain.nav(args.query, args.agent);
    if (name === 'hall_brain_index') return ecoBrain.index(args.agent);
    if (name === 'hall_flow') return ecoBrain.flow(args.name, args.arg);
    if (name === 'hall_web_scrape') return (async () => {
      const rs = require('./lib/rag-scrape');
      const out = await rs.ingest({ agent: args.agent, url: args.url, slug: args.slug, maxChars: args.max_chars });
      if (!out.ok) return 'Scrape failed: ' + out.error;
      return ('\u{1F9E0} **' + out.agent + ' brain now holds** `' + out.slug + '` \u2014 ' + out.chars.toLocaleString() + ' chars\n' + out.title + '\n' + out.url
        + (out.deduped ? '\n(already indexed \u2014 no duplicate)' : '\nlive-indexed; durable copy at ' + out.path));
    })();

  // ── Web pillar — search + scrape for ORACLE/ZEROX research ───────────────
  // web_search: server-side keyword search (Google News RSS → DuckDuckGo), no
  //   key needed. Returns ranked {title, snippet, url}. This is the missing
  //   "ask the RAG brain OR go get live data" leg — pair with rag_search to
  //   answer from the library first, then fall out to the open web.
  if (name === 'web_search') {
    const q = String(args.query || '').trim();
    if (!q) return 'Provide a query to search.';
    return await webSearch(q, Number(args.count) || 6);
  }

  // web_scrape: fetch a URL and strip it to readable text (no markdown cruft).
  //   Used to pull live token pages, docs, or a competitor's site into ZEROX's
  //   reasoning. Enforces HTTPS + a sane size cap; returns plain text.
  if (name === 'web_scrape') {
    const u = String(args.url || '').trim();
    if (!u) return 'Provide a url to scrape.';
    return await webScrape(u, Number(args.max_chars) || 4000);
  }

  return 'Unknown tool: ' + name;
}

// ── Web helpers (ZEROX / ORACLE) ────────────────────────────────────────────
async function webSearch(query, count) {
  const out = [];
  try {
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(rss, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'SHADDAI-MCP/2.0' } });
    if (r.ok) {
      const xml = await r.text();
      const re = /<item>([\s\S]*?)<\/item>/g; let m;
      while ((m = re.exec(xml)) && out.length < count) {
        const rawT = (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
        const u = (m[1].match(/<link[^>]*\/?>(https?:[^<]+)<\/link>|<link>(https?:[^<]+)/) || [])[1] || '';
        const rawD = (m[1].match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || '';
        const dec = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
        const title = dec(rawT).replace(/<[^>]+>/g, '').trim().replace(/\s+-\s+[^-]+$/, '').trim();
        if (!title) continue;
        out.push({ title, snippet: dec(rawD).replace(/<[^>]+>/g, '').trim().slice(0, 200), url: String(u).trim(), source: 'news' });
      }
    }
  } catch (_) {}
  if (out.length < 3) {
    try {
      const r = await fetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1', { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        if (d.AbstractText) out.push({ title: d.Heading || query, snippet: d.AbstractText.slice(0, 400), url: d.AbstractURL, source: 'ddg' });
      }
    } catch (_) {}
  }
  if (!out.length) return 'No web results for "' + query + '".';
  return out.slice(0, count).map((x, i) => '[' + (i + 1) + '] ' + x.title + '\n    ' + x.snippet + '\n    ' + x.url).join('\n\n');
}

async function webScrape(url, maxChars) {
  let parsed;
  try { parsed = new URL(url); } catch (_) { return 'Scrape refused: not a valid URL.'; }
  if (parsed.protocol !== 'https:') return 'Refusing non-HTTPS URL (PIKADON). Only https:// is allowed.';
  const h = parsed.hostname.toLowerCase();
  if (/(^127\.)|(^10\.)|(^192\.168\.)|(^169\.254\.)|(^0\.)|(^172\.(1[6-9]|2\d|3[01])\.)|(^\[?::1\]?$)|^localhost$|.*\.local$|.*\.internal$/.test(h)) {
    return 'Refusing private/loopback host "' + h + '" (PIKADON SSRF guard).';
  }
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'SHADDAI-MCP/2.0 (+https://shaddai.ai)' } });
    if (!r.ok) return 'Scrape failed: HTTP ' + r.status;
    const ct = (r.headers.get('content-type') || '');
    if (!/text\/html|text\/plain|application\/json|application\/xml/.test(ct)) return 'Scrape skipped: content-type "' + ct + '" is not text.';
    const text = await r.text();
    // strip script/style + tags → readable text
    const clean = String(text)
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim();
    if (!clean) return 'Scrape returned no readable text.';
    return clean.slice(0, maxChars);
  } catch (e) {
    return 'Scrape failed: ' + ((e && e.message) || e);
  }
}

// ── Economy plumbing bootstrap ─────────────────────────────────────────────────
const ECO_PAYWALL = process.env.SHADDAI_ENABLE_PAYWALL === '1';
const FREE_TIER_PER_DAY = ecoQuota.FREE_TIER_DAILY_CALLS;
function parseJSON(v, fallback) { if (v == null || v === '') return fallback; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return fallback; } }

function paywallGate(tool, userId) {
  if (!ECO_PAYWALL) return null;
  const price = ecoPaybox.quote(tool);
  if (price <= 0) return null;
  if (ecoQuota.hasFreeCalls(userId)) { ecoQuota.consume(userId); return null; }
  const r = ecoPaybox.createIntent(tool, userId);
  return '402 PAYMENT_REQUIRED — ' + tool + ' costs ' + price.toFixed(2) + ' USDC and free quota (' + FREE_TIER_PER_DAY + '/day) is exhausted for ' + userId + '. Create intent: x402_intent tool=' + tool + ', pay the solana: link, then x402_confirm.';
}

ecoWorkflows.setRunner((tool, args) => callTool(tool, args));

ecoScheduler.register('zerox.watch', async (data) => {
  const p = await cachedPrice(data.symbol || 'BTC');
  if (!p) return 'watched ' + (data.symbol || 'BTC') + ' — no price yet';
  const line = p.name + ' ' + p.price + ' (' + p.change24h + '%)';
  const gate = data.threshold ? Number(data.threshold) : null;
  if (gate && p.price >= gate) {
    ecoDiscoveries.logDiscovery({ agent_id: data.agent_id || 'zerox.watch', type: 'alpha', target: data.symbol || 'BTC', reason: 'price ' + p.price + ' crossed threshold ' + gate, confidence: 0.5, notes: p.name });
    return 'TRIGGERED ' + line + ' — discovery logged, rep credited to ' + (data.agent_id || 'owner');
  }
  return 'watched: ' + line;
});

ecoScheduler.register('hall.announce', async (data) => {
  const r = await ecoTelegram.post(data.text, data.chat_id);
  return r.ok ? 'announced to hall · msg ' + r.message_id : 'announce skipped: ' + r.error;
});

ecoScheduler.register('collect_rent', async (data) => {
  const a = ecoPlots.accrueRent();
  return 'rent collected: ' + a.collected_usdc.toFixed(2) + ' USDC across ' + a.owned + ' owned plots';
});

['oracle.weekly', 'pikadon.recheck', 'sub_agent_work'].forEach((t) => {
  ecoScheduler.register(t, async (data) => {
    if (t === 'sub_agent_work') return 'sub_agent_work: ' + ecoSubagents.stats(data.parent_id || '').queued + ' queued tasks for parent ' + (data.parent_id || '(none)') + ' — auto-run not yet bound';
    return t + ' pipeline queued — bind integrations in Phase 2.5';
  });
});
ecoScheduler.start(3000);

// ── Protocol machinery (stdio, newline-delimited JSON-RPC 2.0) ───────────────
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  line = String(line || '').trim();
  if (!line) return;
  let req;
  try { req = JSON.parse(line); } catch (_) { return; }
  const { id, method, params } = req;
  try {
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'shaddai', version: VERSION },
      } });
    } else if (method === 'tools/list') {
      await loadBackendTools();
      send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    } else if (method === 'tools/call') {
      if (!allowRequest()) {
        if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32005, message: 'Rate limit exceeded: ' + RATE_MAX_PER_SEC + ' tool calls/sec. Retry shortly.' } });
        return;
      }
      const text = await callTool(params && params.name, (params && params.arguments) || {});
      send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: String(text).slice(0, 12000) }] } });
    } else if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} });
    } else if (id !== undefined) {
      send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'method not found: ' + method } });
    }
  } catch (e) {
    if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32603, message: String((e && e.message) || e) } });
  }
});

process.stderr.write('shaddai-unified-mcp v' + VERSION + ' ready → ' + API + ' | money=' + (MONEY_ENABLED ? 'ON' : 'OFF') + ' | rate=' + RATE_MAX_PER_SEC + '/s\n');

// Allow importing as a module (for tests / federation door).
module.exports = { callTool, TOOLS, AGENTS_INFO, API };
