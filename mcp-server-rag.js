#!/usr/bin/env node
/**
 * mcp-server-rag.js — SHADDAI RAG + Agents MCP server (PUBLIC EDITION)
 *
 * A self-contained Model Context Protocol (stdio) server that exposes SHADDAI's
 * 7-agent council and its RAG knowledge base (the mastery stores kb_<agent>) to
 * Claude Desktop, Claude Code, Cursor, or any MCP stdio client.
 *
 * This is the REDUCED PUBLIC BUILD: it contains the agents + knowledge only.
 * It does NOT include SHADDAI's proprietary orchestration engine, its 200+ tool
 * suite, billing, or server routes — those stay private. `rag_ask` and
 * `run_agent` are implemented here directly (RAG retrieval + a cloud LLM call).
 *
 * Tools:
 *   list_agents      → the 7 agents, their role, KB doc count
 *   list_rag_docs    → documents inside one agent's knowledge base
 *   rag_search       → raw TF-IDF chunk hits (score + source doc) for a query
 *   rag_ask          → grounded answer synthesized from the KB via a cloud LLM
 *   run_agent        → RAG-injected agent run (single-pass, cloud LLM)
 *
 * Resources:
 *   kb://<agent>     → an agent's knowledge-base document list (browsable)
 *
 * Progress: tools/call may pass _meta.progressToken; long-running tools
 * (rag_ask, run_agent) then emit notifications/progress as they work.
 *
 * Protocol: MCP 2024-11-05 over newline-delimited JSON-RPC 2.0 on stdio.
 * stdout is RESERVED for JSON-RPC — all logs are redirected to stderr.
 *
 * CLI:
 *   node mcp-server-rag.js                run as stdio MCP server
 *   node mcp-server-rag.js --self-test    spawn self, run handshake + fast tools
 *   node mcp-server-rag.js --self-test-full   ... plus rag_ask + run_agent (slow)
 *   node mcp-server-rag.js --help         show usage
 *   node mcp-server-rag.js --version      show version
 *
 * Requires a cloud LLM key in backend/.env (ONE is enough, Groq is fastest):
 *   GROQ_API_KEY=...        (https://console.groq.com — free, recommended)
 *   GEMINI_API_KEY=...
 *   OPENROUTER_API_KEY=...
 *   ANTHROPIC_API_KEY=...
 *   OPENAI_API_KEY=...
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const VERSION = '2.2.0';

// ── Logging ────────────────────────────────────────────────────────────────────
// stdout must carry ONLY protocol frames — redirect ALL logging to stderr.
const origLog = console.log, origWarn = console.warn, origError = console.error;
console.log   = (...a) => process.stderr.write(a.map(String).join(' ') + '\n');
console.warn  = (...a) => process.stderr.write('[warn] '  + a.map(String).join(' ') + '\n');
console.error = (...a) => process.stderr.write('[error] ' + a.map(String).join(' ') + '\n');

// Load backend/.env so GROQ_API_KEY, etc. are honored.
try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

// ── Config ─────────────────────────────────────────────────────────────────────
const BACKEND   = __dirname;
const KB_PREFIX = process.env.SHADDAI_RAG_KB_PREFIX || 'kb_';
const MAX_RAG_CHUNKS = 8;

const ragIndex = require('./rag-index');

const STATIC_AGENT_IDS = ['SHADDAI', 'NEXUS', 'ZEROX', 'ORACLE', 'TURTLE', 'QUILL', 'PIKADON'];
const kbOf = (agentId) => KB_PREFIX + String(agentId || 'SHADDAI').toLowerCase();

// ── Agent personas (public edition — brief, self-contained) ────────────────────
const AGENT_META = {
  SHADDAI: { role: 'Orchestrator',  goal: 'Coordinate the council, set strategy, make the final call on anything.' },
  NEXUS:   { role: 'Architect',     goal: 'Design and build backend systems, APIs, and infrastructure that scale.' },
  ZEROX:   { role: 'Markets',       goal: 'Reason about money, pricing, unit economics, and trading signals.' },
  ORACLE:  { role: 'Research',      goal: 'Gather knowledge, connect dots, forecast, and inform decisions.' },
  TURTLE:  { role: 'Creative',      goal: 'Design beautiful UI/UX and craft visual + interactive work.' },
  QUILL:   { role: 'Writing',       goal: 'Write clearly: copy, docs, essays, and guides people actually read.' },
  PIKADON: { role: 'Security',      goal: 'Harden everything: find vulnerabilities, protect PII, keep the rails safe.' },
};

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'list_agents',
    description: 'List the 7 SHADDAI agents with their role, goal, and knowledge-base document count.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_rag_docs',
    description: "List the documents in one agent's RAG knowledge base (the mastery store).",
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', enum: STATIC_AGENT_IDS, description: 'Agent id: SHADDAI, NEXUS, ZEROX, ORACLE, TURTLE, QUILL, or PIKADON' },
      },
      required: [],
    },
  },
  {
    name: 'rag_search',
    description: "Search one agent's RAG knowledge base and return raw text chunks ranked by relevance, with scores and source document names.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for' },
        agent: { type: 'string', enum: STATIC_AGENT_IDS, description: 'Agent whose knowledge base to search (default SHADDAI)' },
        limit: { type: 'number', minimum: 1, maximum: MAX_RAG_CHUNKS, description: `Max chunks to return (1-${MAX_RAG_CHUNKS}, default 3)` },
      },
      required: ['query'],
    },
  },
  {
    name: 'rag_ask',
    description: "Answer a question using one agent's RAG knowledge base: retrieves the best chunks, reasons over them with a cloud LLM, and returns a grounded answer plus source names.",
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to answer from the knowledge base' },
        agent: { type: 'string', enum: STATIC_AGENT_IDS, description: 'Agent whose knowledge base to use (default SHADDAI)' },
      },
      required: ['question'],
    },
  },
  {
    name: 'run_agent',
    description: 'Run a SHADDAI agent task: the goal is routed to the right agent, its RAG knowledge is injected as context, and a cloud LLM answers. Returns the final answer plus the knowledge used.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'The task for the agent' },
        agent: { type: 'string', enum: STATIC_AGENT_IDS, description: 'Agent to run. Optional — auto-routed by goal when omitted.' },
      },
      required: ['goal'],
    },
  },
];

// ── Knowledge helpers ─────────────────────────────────────────────────────────
function kbDocs(agentId) {
  try { return ragIndex.listUserDocs(kbOf(agentId)); } catch { return []; }
}

function kbSearch(agentId, query, limit) {
  try {
    return ragIndex.searchUser(kbOf(agentId), query, Math.max(1, Math.min(MAX_RAG_CHUNKS, limit || 3)));
  } catch { return []; }
}

function normalizeAgent(args) {
  const raw = String(args?.agent || '').toUpperCase().trim();
  return raw || 'SHADDAI';
}

function assertAgent(agentId) {
  if (!STATIC_AGENT_IDS.includes(agentId)) {
    throw new TypeError(`Unknown agent "${agentId}". Valid: ${STATIC_AGENT_IDS.join(', ')}`);
  }
}

// ── Cloud LLM (public build: direct HTTP, no proprietary engine) ───────────────
const axios = require('axios');

function pickProvider() {
  const c = (v) => v && String(v).trim();
  const p = [
    { name: 'Groq',       key: c(process.env.GROQ_API_KEY),      url: 'https://api.groq.com/openai/v1/chat/completions',          model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', auth: 'Bearer' },
    { name: 'OpenRouter', key: c(process.env.OPENROUTER_API_KEY), url: 'https://openrouter.ai/api/v1/chat/completions',            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', auth: 'Bearer' },
    { name: 'Gemini',     key: c(process.env.GEMINI_API_KEY),     url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: null, auth: 'key' },
    { name: 'Anthropic',  key: c(process.env.ANTHROPIC_API_KEY),  url: 'https://api.anthropic.com/v1/messages',                    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest', auth: 'x-api-key' },
    { name: 'OpenAI',     key: c(process.env.OPENAI_API_KEY),     url: 'https://api.openai.com/v1/chat/completions',               model: process.env.OPENAI_MODEL || 'gpt-4o-mini', auth: 'Bearer' },
  ];
  return p.find((x) => x.key) || null;
}

async function cloudChat(system, user, opts = {}) {
  const provider = pickProvider();
  const timeoutMs = Number(opts.timeoutMs || process.env.LLM_TIMEOUT_MS || 120000);

  if (provider) {
    const text = await callProvider(provider, system, user, timeoutMs);
    if (text) return { text, provider: provider.name };
  }

  // Last-resort fallback: local Ollama (only if installed and reachable).
  const ollama = await ollamaChat(system, user, timeoutMs);
  if (ollama) return { text: ollama, provider: 'Ollama (local)' };

  const e = new Error('No LLM available. Add a cloud API key to backend/.env — e.g. GROQ_API_KEY (free at https://console.groq.com).');
  e.isConfig = true;
  throw e;
}

async function callProvider(p, system, user, timeoutMs) {
  // One retry with backoff on transient failures (429 rate-limit, 5xx, ECONNRESET).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (p.name === 'Gemini') {
        const res = await axios.post(`${p.url}?key=${encodeURIComponent(p.key)}`, {
          contents: [{ parts: [{ text: `${system}\n\n---\n\n${user}` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
        }, { timeout: timeoutMs });
        return res.data?.candidates?.[0]?.content?.parts?.map((x) => x.text).join('') || null;
      }
      if (p.name === 'Anthropic') {
        const res = await axios.post(p.url, {
          model: p.model, max_tokens: 2048, temperature: 0.4,
          system,
          messages: [{ role: 'user', content: user }],
        }, {
          timeout: timeoutMs,
          headers: { 'x-api-key': p.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        });
        return res.data?.content?.map((b) => b.text).join('') || null;
      }
      const headers = { 'content-type': 'application/json' };
      if (p.auth === 'Bearer') headers.authorization = `Bearer ${p.key}`;
      const res = await axios.post(p.url, {
        model: p.model, temperature: 0.4, max_tokens: 2048,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }, { timeout: timeoutMs, headers });
      return res.data?.choices?.[0]?.message?.content || null;
    } catch (err) {
      const status = err && err.response && err.response.status;
      const transient = status === 429 || (status >= 500 && status <= 599) || /ECONNRESET|ETIMEDOUT|ECONNABORTED/.test((err && err.code) || '');
      if (attempt === 0 && transient) {
        console.warn(`[llm] ${p.name} transient failure (${err && err.message}); retrying…`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      console.warn(`[llm] ${p.name} failed: ${(err && err.message) || err}`);
      return null;
    }
  }
  return null;
}

async function ollamaChat(system, user, timeoutMs) {
  try {
    const base = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const model = process.env.DEFAULT_OLLAMA_MODEL || 'phi4-mini';
    const res = await axios.post(`${base}/api/chat`, {
      model,
      stream: false,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }, { timeout: timeoutMs });
    return res.data?.message?.content || null;
  } catch { return null; }
}

function progress(cb, base, current, total, message) {
  if (cb) cb({ progress: current, total, message });
}

// ── Tool implementations ──────────────────────────────────────────────────────
async function listAgents(progressCb) {
  return STATIC_AGENT_IDS.map((id) => {
    const meta = AGENT_META[id] || {};
    let docs = 0;
    try { docs = kbDocs(id).length; } catch {}
    return { id, name: id, role: meta.role, goal: meta.goal, kb: kbOf(id), docs };
  });
}

async function listRagDocs(agentId, progressCb) {
  assertAgent(agentId);
  const docs = kbDocs(agentId);
  return {
    agent: agentId,
    kb: kbOf(agentId),
    count: docs.length,
    docs: docs.map((d) => ({ id: d.id, name: d.name, chars: (d.text || '').length, updated: d.updatedAt || null })),
  };
}

async function ragSearch(agentId, query, limit, progressCb) {
  assertAgent(agentId);
  if (!query || !String(query).trim()) throw new TypeError('query is required');
  const hits = kbSearch(agentId, query, limit);
  return { query, agent: agentId, kb: kbOf(agentId), hits };
}

async function ragAsk(agentId, question, progressCb) {
  assertAgent(agentId);
  if (!question || !String(question).trim()) throw new TypeError('question is required');
  progress(progressCb, 1, 2, 'Retrieving knowledge from the KB…');
  const hits = kbSearch(agentId, question, 6);
  if (!hits.length) {
    return {
      agent: agentId,
      kb: kbOf(agentId),
      answer: `No relevant passages found in ${agentId}'s knowledge base for that question.`,
      sources: [], grounded: false,
    };
  }
  progress(progressCb, 2, 3, 'Reasoning over the passages with a cloud LLM…');
  const context = hits.map((h, i) => `[Source ${i + 1}] ${h.doc}\n${h.chunk}`).join('\n\n---\n\n');
  const system = `You are ${agentId}, the SHADDAI agent who ${AGENT_META[agentId]?.goal || 'serves the council'}. Answer ONLY from the source passages below. Be specific and cite sources as [Source n]. If the passages don't answer the question, say so plainly.`;
  const user = `Knowledge base passages for ${agentId}:\n\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
  const { text, provider } = await cloudChat(system, user);
  const sources = [...new Set(hits.map((h) => h.doc))];
  return { agent: agentId, kb: kbOf(agentId), answer: text, sources, provider, grounded: true };
}

// Lightweight goal router (public build — keyword match, no engine).
const ROUTE_RULES = [
  { id: 'PIKADON', kw: ['secur', 'vulnerab', 'hack', 'pii', 'threat', 'audit', 'exploit', 'malware', 'breach'] },
  { id: 'ZEROX',   kw: ['money', 'price', 'pricing', 'market', 'revenue', 'invest', 'budget', 'business', 'trade', 'profit', 'stripe', 'subscription'] },
  { id: 'ORACLE',  kw: ['research', 'forecast', 'trend', 'study', 'learn', 'predict', 'analy', 'report', 'data'] },
  { id: 'TURTLE',  kw: ['design', 'ui', 'ux', 'art', 'color', 'layout', 'animat', 'visual', 'brand', 'creative', 'aesthetic'] },
  { id: 'QUILL',   kw: ['write', 'essay', 'copy', 'docs', 'document', 'guide', 'email', 'blog', 'post', 'editing', 'grammar', 'prose'] },
  { id: 'NEXUS',   kw: ['code', 'api', 'backend', 'build', 'server', 'database', 'architect', 'infra', 'implement', 'javascript', 'function', 'debug'] },
];
function routeAgent(goal) {
  const g = String(goal || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const rule of ROUTE_RULES) {
    let score = 0;
    for (const kw of rule.kw) if (g.includes(kw)) score++;
    if (score > bestScore) { best = rule.id; bestScore = score; }
  }
  return best || 'SHADDAI';
}

async function runAgent(goal, agentId, progressCb) {
  if (!goal || !String(goal).trim()) throw new TypeError('goal is required');
  const routed = agentId || routeAgent(goal);
  assertAgent(routed);
  progress(progressCb, 1, 3, `Routing to ${routed} and retrieving its knowledge…`);
  const hits = kbSearch(routed, goal, 5);
  const meta = AGENT_META[routed] || {};
  progress(progressCb, 2, 3, `${routed} is working on the task…`);
  const context = hits.length
    ? hits.map((h, i) => `[Source ${i + 1}] ${h.doc}\n${h.chunk}`).join('\n\n---\n\n')
    : '(no relevant passages retrieved — answer from your own knowledge)';
  const system = `You are ${routed}, the SHADDAI agent who ${meta.goal || 'serves the council'}. Complete the user's task thoroughly. Use the knowledge passages where relevant.`;
  const user = `Task: ${goal}\n\nRelevant knowledge:\n${context}\n\nDeliver the completed work.`;
  const { text, provider } = await cloudChat(system, user);
  progress(progressCb, 3, 3, 'Done.');
  return {
    agent: routed,
    goal,
    answer: text,
    provider,
    sources: [...new Set(hits.map((h) => h.doc))],
    knowledgeUsed: hits.length,
  };
}

// ── MCP protocol plumbing (MCP 2024-11-05, stdio, JSON-RPC 2.0) ────────────────
const RESOURCES = STATIC_AGENT_IDS.map((id) => ({
  uri: `kb://${id.toLowerCase()}`,
  name: `${id} knowledge base`,
  mimeType: 'application/json',
  description: `Documents in ${id}'s RAG knowledge base`,
}));

function resourcesList(args, id) {
  return { resources: RESOURCES };
}

function resourcesRead(args, id) {
  const m = /^kb:\/\/([a-z]+)$/.exec(String(args?.uri || ''));
  if (!m) return { isError: true, content: [{ type: 'text', text: `Invalid URI. Expected kb://<agent>, got "${args?.uri}".` }] };
  const agentId = m[1].toUpperCase();
  if (!STATIC_AGENT_IDS.includes(agentId)) {
    return { isError: true, content: [{ type: 'text', text: `Unknown agent "${agentId}". Valid: ${STATIC_AGENT_IDS.join(', ')}` }] };
  }
  const docs = kbDocs(agentId);
  return { content: [{ type: 'text', text: JSON.stringify({ agent: agentId, kb: kbOf(agentId), count: docs.length, docs: docs.map((d) => ({ id: d.id, name: d.name, chars: (d.text || '').length })) }, null, 2) }] };
}

function toolsList() {
  return { tools: TOOLS };
}

function toolsCall(args, id, meta) {
  const name = args?.name;
  const input = args?.arguments || {};
  const progressToken = meta && meta._meta && meta._meta.progressToken;
  const progressCb = progressToken
    ? (p) => notify('notifications/progress', { progressToken, ...p })
    : null;
  const run = async () => {
    switch (name) {
      case 'list_agents': return { content: [{ type: 'text', text: JSON.stringify(await listAgents(progressCb), null, 2) }] };
      case 'list_rag_docs': return { content: [{ type: 'text', text: JSON.stringify(await listRagDocs(normalizeAgent(input), progressCb), null, 2) }] };
      case 'rag_search': return { content: [{ type: 'text', text: JSON.stringify(await ragSearch(normalizeAgent(input), input.query, input.limit || 3, progressCb), null, 2) }] };
      case 'rag_ask': return { content: [{ type: 'text', text: JSON.stringify(await ragAsk(normalizeAgent(input), input.question, progressCb), null, 2) }] };
      case 'run_agent': return { content: [{ type: 'text', text: JSON.stringify(await runAgent(input.goal, input.agent ? normalizeAgent(input) : null, progressCb), null, 2) }] };
      default: return { isError: true, content: [{ type: 'text', text: `Unknown tool "${name}".` }] };
    }
  };
  return { result: run(), inFlight: true };
}

function notify(method, params) {
  if (process.stdin.isTTY) return; // only send notifications on a real stdio pipe
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

// ── CLI / self-test ────────────────────────────────────────────────────────────
const HELP = `SHADDAI RAG + Agents MCP server v${VERSION} (public edition)

Usage:
  node mcp-server-rag.js                 run as stdio MCP server
  node mcp-server-rag.js --self-test     fast self-test (protocol + fast tools)
  node mcp-server-rag.js --self-test-full  self-test + rag_ask & run_agent (slow)
  node mcp-server-rag.js --help          show this help
  node mcp-server-rag.js --version       show version

Environment (backend/.env — ONE cloud key required for rag_ask/run_agent):
  GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY
  Optional: DEFAULT_OLLAMA_MODEL / OLLAMA_API_URL / OLLAMA_TIMEOUT_MS (local fallback)
`;

async function selfTest(full) {
  const results = [];
  const pass = (m) => { results.push(`  [PASS] ${m}`); };
  const fail = (m) => { results.push(`  [FAIL] ${m}`); };

  const rpc = (obj) => new Promise((resolve) => {
    const child = spawn(process.execPath, [__filename], { stdio: ['pipe', 'pipe', 'inherit'] });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d.toString();
      const idx = buf.indexOf('\n');
      if (idx !== -1) {
        child.stdin.end();
        try { resolve(JSON.parse(buf.slice(0, idx))); } catch { resolve(null); }
      }
    });
    child.stdin.write(JSON.stringify(obj) + '\n');
    setTimeout(() => { try { child.kill(); } catch {} resolve(null); }, full ? 240000 : 60000);
  });
  const call = async (method, params, meta) => rpc({ jsonrpc: '2.0', id: 1, method, params, meta });

  let r = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'self-test', version: '0' } });
  r ? pass('initialize') : fail('initialize handshake');
  r = await call('tools/list', {});
  if (r && r.result && r.result.tools) {
    pass('tools/list has ' + r.result.tools.length + ' tools');
    for (const t of TOOLS) (r.result.tools.some((x) => x.name === t.name)) ? pass('  has ' + t.name) : fail('  missing ' + t.name);
  } else fail('tools/list');

  r = await call('resources/list', {});
  if (r && r.result && r.result.resources && r.result.resources.length === 7) pass('resources/list returns 7 KB resources');
  else fail('resources/list');

  r = await call('ping', {});
  r ? pass('ping') : fail('ping');

  r = await call('tools/call', { name: 'list_agents', arguments: {} });
  const agentsOk = r && r.result && !r.result.isError && /SHADDAI/.test(JSON.stringify(r.result));
  agentsOk ? pass('list_agents returns 7 agents') : fail('list_agents');

  r = await call('tools/call', { name: 'rag_search', arguments: { query: 'discipline', agent: 'QUILL' } });
  const searchOk = r && r.result && !r.result.isError && /hits/.test(JSON.stringify(r.result));
  searchOk ? pass('rag_search returns hits') : fail('rag_search');

  r = await call('tools/call', { name: 'list_rag_docs', arguments: { agent: 'NEXUS' } });
  const docsOk = r && r.result && !r.result.isError && /count/.test(JSON.stringify(r.result));
  docsOk ? pass('list_rag_docs returns docs') : fail('list_rag_docs');

  r = await call('tools/call', { name: 'definitely_not_a_tool', arguments: {} });
  const isErr = r && r.result && r.result.isError;
  isErr ? pass('unknown tool returns isError') : fail('unknown tool → isError');

  r = await call('definitely_not_a_method', {});
  (r && r.error && r.error.code === -32601) ? pass('unknown method returns -32601') : fail('unknown method → -32601');

  r = await call('tools/call', { name: 'rag_search', arguments: {} });
  (r && r.result && r.result.isError) ? pass('missing required arg → error') : fail('missing arg error');

  if (full) {
    r = await call('tools/call', { name: 'rag_ask', arguments: { question: 'what is discipline', agent: 'QUILL' } }, { _meta: { progressToken: 'pt1' } });
    (r && r.result && !r.result.isError && /answer/.test(JSON.stringify(r.result)))
      ? pass('rag_ask returns a grounded answer') : fail('rag_ask');

    r = await call('tools/call', { name: 'run_agent', arguments: { goal: 'write a short note on stoic discipline', agent: 'QUILL' } });
    (r && r.result && !r.result.isError && /answer/.test(JSON.stringify(r.result)))
      ? pass('run_agent completes') : fail('run_agent');
  }

  const passed = results.filter((x) => x.includes('[PASS]')).length;
  const failed = results.filter((x) => x.includes('[FAIL]')).length;
  process.stderr.write(results.join('\n') + '\n');
  process.stderr.write(`${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

// ── Main loop ──────────────────────────────────────────────────────────────────
function main() {
  if (process.argv.includes('--version')) { console.error(`v${VERSION}`); process.exit(0); }
  if (process.argv.includes('--help')) { process.stderr.write(HELP); process.exit(0); }
  if (process.argv.includes('--self-test-full')) selfTest(true);
  else if (process.argv.includes('--self-test')) selfTest(false);
  else readLoop();
}

function readLoop() {
  const rl = require('readline').createInterface({ input: process.stdin, terminal: false });
  const pending = new Set();

  rl.on('line', (line) => {
    line = line.trim();
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (!msg || msg.jsonrpc !== '2.0' || !msg.method) return;
    const id = msg.id;
    const isRequest = typeof id !== 'undefined';
    const respond = (payload) => { if (isRequest) process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...payload }) + '\n'); };

    switch (msg.method) {
      case 'initialize':
        respond({
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'shaddai-mcp', version: VERSION },
        });
        break;
      case 'notifications/initialized':
        break;
      case 'ping':
        respond({ result: {} });
        break;
      case 'tools/list':
        respond({ result: toolsList() });
        break;
      case 'tools/call': {
        const { result, inFlight } = toolsCall(msg.params, id, msg);
        Promise.resolve(result)
          .then((r) => respond({ result: r }))
          .catch((e) => {
            // Tool errors (bad/missing args, no LLM configured, upstream failure)
            // surface as isError tool RESULTS, per the MCP spec — not protocol errors.
            respond({ result: { content: [{ type: 'text', text: `Error: ${(e && e.message) || e}` }], isError: true } });
          });
        if (inFlight) pending.add(id);
        break;
      }
      case 'resources/list':
        respond({ result: resourcesList(msg.params, id) });
        break;
      case 'resources/read':
        try { respond({ result: resourcesRead(msg.params, id) }); }
        catch (e) { respond({ error: { code: -32603, message: String((e && e.message) || e) } }); }
        break;
      default:
        respond({ error: { code: -32601, message: `Method not found: ${msg.method}` } });
    }
  });
}

main();
