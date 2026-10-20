// rag-scrape.js — scrape a public page and fold it into the SHADDAI brain.
//
// Two writes:
//   1) backend/knowledge/mastery/<AGENT>/rag-<slug>.md     (durable source of truth;
//      the server's boot-time RAG rebuild re-reads these files)
//   2) rag.addDocument('kb_<agent>', 'MASTERY_rag-<slug>', ...)  (live index, so the
//      brain serves it immediately without a restart; name matches the boot builder's
//      naming so the next boot dedupes instead of duplicating it)
'use strict';
const fs = require('fs');
const path = require('path');
const scraper = require('./web-scrape.js');

const MASTERY_ROOT = path.join(__dirname, '..', 'knowledge', 'mastery');
const AGENTS = ['SHADDAI', 'ORACLE', 'ZEROX', 'NEXUS', 'TURTLE', 'QUILL', 'PIKADON'];
const MIN_CHARS = 300;

function _agentDir(agent) {
  const a = String(agent || '').trim().toUpperCase();
  if (!AGENTS.includes(a)) return null;
  return a;
}
function _slugFromUrl(url) {
  const u = new URL(url);
  const base = u.hostname.replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const tail = u.pathname.split('/').filter(Boolean).pop() || '';
  const t = tail.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  return (base + (t ? '-' + t : '')).slice(0, 60) || 'page';
}
function _safeFile(name) {
  return String(name || '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'page';
}

// Returns { ok, error? } or { ok:true, agent, slug, docId, chars, title, url, path }
async function ingest({ agent, url, slug: slugInput, maxChars }) {
  const a = _agentDir(agent);
  if (!a) return { ok: false, error: 'agent must be one of: ' + AGENTS.join(', ') };
  if (!/^https:\/\//i.test(String(url || ''))) return { ok: false, error: 'url must start with https://' };
  let r;
  try { r = await scraper.scrape({ url, maxChars: maxChars || 60000 }); }
  catch (e) { return { ok: false, error: 'scrape failed: ' + (e && e.message || e) }; }
  if (!r.text || r.text.length < MIN_CHARS) return { ok: false, error: 'page yielded too little readable text (' + (r.text || '').length + ' chars) — it may be a JS-heavy site; pick a static page or a scraper engine.' };
  // BUGFIX (2026-09-11): was `const slug = _safeFile(slug || ...)` -- redeclaring
  // the destructured `slug` param as a const in the same scope, a hard
  // SyntaxError ("Identifier 'slug' has already been declared") that made this
  // whole file unloadable. Currently dead code (nothing requires rag-scrape.js
  // yet), so it never surfaced -- but any future require() would have crashed
  // the whole process at load time. Renamed the param to slugInput instead.
  const slug = _safeFile(slugInput || _slugFromUrl(url));
  const md = scraper.toMarkdown(r);
  // durable source
  const dir = path.join(MASTERY_ROOT, a);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'rag-' + slug + '.md');
  fs.writeFileSync(file, md, 'utf8');
  // live index (same naming as the boot builder → dedupe on next boot)
  const rag = require('../rag-index.js');
  const agentKey = 'kb_' + a.toLowerCase();
  const docName = 'MASTERY_rag-' + slug;
  const existing = rag.listUserDocs(agentKey);
  const hit = (existing || []).find((d) => d.name === docName);
  if (hit) return { ok: true, agent: a, slug, docId: hit.id, chars: r.text.length, deduped: true, title: r.title, url: r.finalUrl, path: file };
  const added = rag.addDocument(agentKey, docName, md, { url: r.finalUrl, title: r.title, kind: 'scrape', scrapedAt: r.scrapedAt });
  return { ok: true, agent: a, slug, docId: added.docId, chunks: added.chunks, chars: r.text.length, title: r.title, url: r.finalUrl, path: file };
}

// Express handler for POST /api/rag/scrape
function handler(req, res) {
  const b = (req && req.body) || {};
  ingest({ agent: b.agent, url: b.url, slug: b.slug, maxChars: b.maxChars })
    .then((r) => { const code = r.ok ? 200 : (String(r.error || '').includes('agent must') ? 400 : 422); res.status(code).json(r); })
    .catch((e) => res.status(500).json({ ok: false, error: (e && e.message) || String(e) }));
}

module.exports = { ingest, handler, _agentDir, _slugFromUrl, _safeFile, MIN_CHARS, AGENTS };