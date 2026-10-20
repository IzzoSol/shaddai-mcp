// eco-brain.js — local RAG organization + retrieval over the SHADDAI brain.
//
// Reads the brain-server's on-disk per-agent knowledge bases (backend/data/rag/kb_<agent>/docs.json)
// so MCP clients get ORGANIZED retrieval locally — no live API, no key, no quota.
// Scoring is TF × smooth-IDF over the local corpus, so it works fully offline and
// returns plain answers an agent (ORACLE/ZEROX/NEXUS/TURTLE/QUILL/PIKADON/SHADDAI) can act on.
'use strict';
const fs = require('fs');
const path = require('path');

const RAG_ROOT = path.join(__dirname, '..', '..', 'backend', 'data', 'rag');
const AGENTS = ['SHADDAI', 'ORACLE', 'ZEROX', 'NEXUS', 'TURTLE', 'QUILL', 'PIKADON'];
const _cache = {}; // agent -> { mtime, docs: [{id,name,text}] }

function _docs(agent) {
  const dir = path.join(RAG_ROOT, 'kb_' + String(agent).toLowerCase());
  const file = path.join(dir, 'docs.json');
  let st = null;
  try { st = fs.statSync(file); } catch (e) { return []; }
  const c = _cache[agent];
  if (c && c.mtime === st.mtimeMs) return c.docs;
  let docs = [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    docs = (Array.isArray(raw) ? raw : (raw.docs || raw.chunks || [])).map((d) => ({
      id: String(d.id || ''),
      name: String(d.name || d.title || 'untitled'),
      text: String(d.text || d.content || ''),
    }));
  } catch (e) { docs = []; }
  _cache[agent] = { mtime: st.mtimeMs, docs };
  return docs;
}
function _terms(q) {
  return String(q || '').toLowerCase().split(/[^a-z0-9$#]+/i).filter((t) => t.length > 2);
}
function _snippet(text, terms, maxLen) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const low = t.toLowerCase();
  let best = 0, pos = 0;
  for (const term of terms) { const i = low.indexOf(term.toLowerCase()); if (i >= 0 && (i < best || best === 0)) { best = i; pos = i; } }
  if (best === 0 && !terms.some((x) => low.includes(x.toLowerCase()))) pos = 0;
  const start = Math.max(0, pos - (maxLen || 260) / 3);
  let out = (start > 0 ? '…' : '') + t.slice(start, start + (maxLen || 260));
  for (const term of terms) { const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); out = out.replace(re, '<b>$1</b>'); }
  return out + (start + (maxLen || 260) < t.length ? '…' : '');
}
function _idf(agent, docs) {
  const n = docs.length || 1;
  const df = {};
  for (const d of docs) { const seen = new Set(); for (const w of String(d.text).toLowerCase().split(/[^a-z0-9$#]+/i)) { if (w.length > 2 && !seen.has(w)) { seen.add(w); df[w] = (df[w] || 0) + 1; } } }
  return (w) => Math.log(1 + n / (1 + (df[w] || 0)));
}
function _score(agentDocs, terms) {
  const docs = agentDocs.docs;
  const idf = _idf(agentDocs.agent, docs);
  const scored = [];
  for (const d of docs) {
    const low = ' ' + d.text.toLowerCase() + ' ';
    let s = 0;
    for (const t of terms) { const re = new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'); const ms = low.match(re); if (ms) s += ms.length * (1 + idf(t)); }
    if (s > 0) scored.push({ score: s, doc: d });
  }
  return scored.sort((a, b) => b.score - a.score);
}

// Organize an answer from the local brain. Narrows to one agent if given,
// else returns the strongest passages across the whole guild, ranked by agent.
function nav(query, agent) {
  const q = String(query || '').trim();
  if (!q) return 'Give me a question to search the SHADDAI brain.';
  const terms = _terms(q);
  if (!terms.length) return 'Too few meaningful terms — try a longer question.';
  const agents = agent ? [String(agent).toUpperCase()] : AGENTS;
  const lines = ['🧠 <b>SHADDAI BRAIN — ' + _esc(q.slice(0, 80)) + '</b>\n'];
  let any = false;
  for (const a of agents) {
    const docs = _docs(a);
    if (!docs.length) continue;
    const top = _score({ agent: a, docs }, terms).slice(0, 2);
    if (!top.length) continue;
    any = true;
    lines.push('<b>' + a + '</b> — ' + top.length + ' passage(s):');
    for (const r of top) lines.push('  ▸ <i>' + _esc(r.doc.name) + '</i>\n    ' + _snippet(r.doc.text, terms, 230));
    lines.push('');
  }
  if (!any) return 'The local brain has no hits for <b>' + _esc(q) + '</b> in your ask scope. Try more general phrasing, or ask an agent directly (/oracle /zerox /nexus).';
  lines.push('→ Ask it live: /oracle ' + _esc(q) + ' · or return the top passage at face value.');
  return lines.join('\n');
}

// Topic index — what each agent's brain covers, for organizing retrieval.
function index(agent) {
  const agents = agent ? [String(agent).toUpperCase()] : AGENTS;
  const out = ['🗂 <b>SHADDAI BRAIN INDEX</b>\n'];
  for (const a of agents) {
    const docs = _docs(a);
    const freq = {};
    for (const d of docs) {
      for (const w of String(d.text).toLowerCase().split(/[^a-z0-9$#]+/i)) { if (w.length > 4) freq[w] = (freq[w] || 0) + 1; }
    }
    const terms = Object.entries(freq).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([t]) => t);
    const names = docs.slice(0, 5).map((d) => d.name).join(' · ');
    out.push('⬡ <b>' + a + '</b> — ' + docs.length + ' source(s)\n  topics: ' + (terms.join(', ') || '—') + (names ? '\n  docs: ' + _esc(names) : ''));
    out.push('');
  }
  out.push('→ /master · hall_rag_nav "<your question>"');
  return out.join('\n');
}

// Simple in-Hall workflows composed from REAL local tools.
function flow(name, arg) {
  const n = String(name || '').toLowerCase();
  const g = n === 'daily' ? _flowDaily(arg) : n === 'intel' ? _flowIntel(arg) : n === 'know' ? _flowKnow(arg) : null;
  if (!g) return 'Flow ' + _esc(name) + ' not found. Flows: <b>daily</b> · <b>intel</b> · <b>know &lt;topic&gt;</b>';
  return g;
}
function _esc(s) { return String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); }
function _flowDaily(arg) {
  const com = require('./eco-community.js');
  const lines = ['📋 <b>DAILY FLOW</b> — ' + new Date().toISOString().slice(0, 10) + '\n'];
  try { lines.push(com.stats() + '\n'); } catch (e) {}
  try { lines.push(com.leaderboard() + '\n'); } catch (e) {}
  try { const h = com.hot(4); lines.push('🔥 Hot calls\n' + (h.split('\n').slice(0, 4).join('\n')) + '\n'); } catch (e) {}
  try { lines.push(com.astro(String(arg || 'aries'))); } catch (e) {}
  return lines.join('\n');
}
function _flowIntel(arg) {
  const com = require('./eco-community.js');
  const lines = ['🗺 <b>INTEL FLOW</b> — ' + new Date().toISOString().slice(0, 16) + 'Z\n'];
  try { lines.push(com.astro(String(arg || 'aries')) + '\n'); } catch (e) {}
  try { const h = com.hot(5); lines.push('🔥 Conviction room\n' + h + '\n'); } catch (e) {}
  try { lines.push('⚔️ Arena log\n' + com.arenaHistory(3)); } catch (e) {}
  return lines.join('\n');
}
function _flowKnow(arg) {
  const q = String(arg || '').trim() || 'sovereign AI agents';
  return nav(q);
}

module.exports = { nav, index, flow, _docs, _terms };