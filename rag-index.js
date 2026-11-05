'use strict';

/**
 * rag-index.js
 * Per-user document RAG store using TF-IDF cosine similarity.
 * Pure Node.js — no external packages required.
 *
 * Pattern adapted from ./skill-embeddings.js (tokenize, termFrequency, cosineSim)
 * — comments there explain the math. This module:
 *   - chunks documents into ~500-word windows
 *   - persists per-user docs to backend/data/rag/{user}/docs.json
 *   - rebuilds the user's TF-IDF + IDF on every write so search reflects
 *     the latest corpus (re-normalizing each chunk vector)
 *   - serves the static NVIDIA skills manifest (skills/nvidia-skills.json) as
 *     a searchable catalog alongside the per-user stores
 */

const fs = require('fs');
const path = require('path');

// ─── reuse tokenization from skill-embeddings.js where possible ──────────────
// (skill-embeddings.js doesn't export tokenize/termFrequency; copy with attribution.)
const STOPWORDS = new Set([
  'the','a','an','is','it','in','on','at','to','for','of','and','or','with',
  'that','this','are','was','be','as','by','from','you','your','use','when',
  'user','wants','also','can','will','not','all','any','have','has','been',
  'they','their','them','we','our','more','one','two','three','such','about',
  'how','what','which','who','its','if','do','does','did','so','no','my',
  'than','but','would','could','should','may','might','get','set','used',
  'using','into','over','up','out','see','new','each','other','these','those',
]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function termFrequency(tokens) {
  const tf = new Map();
  if (!tokens.length) return tf;
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [term, count] of tf) tf.set(term, count / tokens.length);
  return tf;
}

function cosineSim(vecA, vecB) {
  const [small, large] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];
  let dot = 0;
  for (const [term, w] of small) {
    const w2 = large.get(term);
    if (w2 !== undefined) dot += w * w2;
  }
  return dot;
}

// ─── storage ─────────────────────────────────────────────────────────────────
const RAG_ROOT = path.join(__dirname, 'data', 'rag');

function safeUser(user) {
  // Whitelist; collapse weird chars to underscore. Empty → 'guest'.
  const u = String(user || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return u || 'guest';
}

function userDir(user) {
  const dir = path.join(RAG_ROOT, safeUser(user));
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function docsPath(user) {
  return path.join(userDir(user), 'docs.json');
}

function loadDocs(user) {
  const p = docsPath(user);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return []; }
}

function saveDocs(user, docs) {
  fs.writeFileSync(docsPath(user), JSON.stringify(docs, null, 2), 'utf8');
}

// ─── chunking (~500 words per chunk) ─────────────────────────────────────────
const CHUNK_WORDS = 500;

function chunkText(text) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks = [];
  for (let i = 0; i < words.length; i += CHUNK_WORDS) {
    chunks.push(words.slice(i, i + CHUNK_WORDS).join(' '));
  }
  return chunks;
}

// ─── index build: compute IDF over ALL chunks of a user, then per-chunk vec ──
function rebuildVectors(docs) {
  // Collect all chunks → compute doc frequency (chunk-level)
  const docFreq = new Map();
  const allChunkTokens = [];

  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const tokens = tokenize(chunk.text);
      allChunkTokens.push(tokens);
      const seen = new Set(tokens);
      for (const term of seen) docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const N = allChunkTokens.length;
  const idf = {};
  for (const [term, df] of docFreq) {
    idf[term] = Math.log((N + 1) / (df + 1)) + 1;
  }

  // Assign normalized TF-IDF vectors back to chunks (stored as plain objects)
  let i = 0;
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const tf = termFrequency(allChunkTokens[i++]);
      const vec = {};
      let mag = 0;
      for (const [term, tfw] of tf) {
        const w = tfw * (idf[term] || 0);
        if (w > 0) { vec[term] = w; mag += w * w; }
      }
      mag = Math.sqrt(mag);
      if (mag > 0) for (const t of Object.keys(vec)) vec[t] /= mag;
      chunk.tfIdfVector = vec;
    }
  }

  return { idf, N };
}

function vectorizeQuery(query, idf) {
  const tokens = tokenize(query);
  if (!tokens.length) return null;
  const tf = termFrequency(tokens);
  const vec = new Map();
  let mag = 0;
  for (const [term, tfw] of tf) {
    const idfw = idf[term] || 0;
    if (!idfw) continue;
    const w = tfw * idfw;
    vec.set(term, w);
    mag += w * w;
  }
  if (!vec.size) return null;
  mag = Math.sqrt(mag);
  for (const [t, w] of vec) vec.set(t, w / mag);
  return vec;
}

// -- static corpus: NVIDIA skills manifest ---------------------------------------
// The curated NVIDIA skill catalog is a static, repo-local data source that
// sits beside the per-user RAG stores. It is loaded on demand (no cache, so a
// manifest edit is picked up without restarting the server) and exposed through
// the same module boundary the server already uses for knowledge access.
const NVIDIA_SKILLS_MANIFEST = path.join(__dirname, 'skills', 'nvidia-skills.json');
const NVIDIA_SKILL_CATEGORIES = ['omniverse', 'physical-ai', 'cosmos', 'climate', 'rag', 'vision', 'tao', 'data', 'meta'];
const SAFE_SKILL_ID = /^[a-z0-9][a-z0-9._-]*$/;

function loadNvidiaSkills() {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(NVIDIA_SKILLS_MANIFEST, 'utf8')); }
  catch { return []; }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s.id === 'string' && SAFE_SKILL_ID.test(s.id))
    .map((s) => ({
      id: s.id,
      name: String(s.name || s.id),
      version: String(s.version || ''),
      license: String(s.license || ''),
      description: String(s.description || ''),
      category: NVIDIA_SKILL_CATEGORIES.includes(s.category) ? s.category : 'meta',
      source: String(s.source || 'NVIDIA/skills'),
      requiresGpu: !!s.requiresGpu,
      gpuReason: s.requiresGpu ? String(s.gpuReason || '') : '',
      sapRelevance: String(s.sapRelevance || ''),
    }));
}

function listNvidiaSkills() {
  return loadNvidiaSkills();
}

function getNvidiaSkill(id) {
  const key = String(id || '').trim();
  return loadNvidiaSkills().find((s) => s.id === key) || null;
}

/**
 * Keyword filter over the NVIDIA skill manifest. Matches on id, name,
 * description, category, and sapRelevance. Returns the matched entries with a
 * simple token-hit score, sorted by score then id.
 */
function searchNvidiaSkills(query, opts) {
  const o = opts || {};
  const limit = Math.max(1, Math.min(48, Number(o.limit) || 10));
  const category = o.category ? String(o.category) : null;
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const hits = [];
  for (const s of loadNvidiaSkills()) {
    if (category && s.category !== category) continue;
    const hay = `${s.id} ${s.name} ${s.description} ${s.category} ${s.sapRelevance} ${s.requiresGpu ? 'gpu' : ''}`.toLowerCase();
    const matched = [];
    for (const t of tokens) if (hay.includes(t)) matched.push(t);
    if (!matched.length) continue;
    hits.push({ ...s, score: matched.length, matched });
  }
  hits.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
  return hits.slice(0, limit);
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Add a document for a user. Chunks text, recomputes TF-IDF across all of the
 * user's chunks, and persists docs.json. Returns {docId, chunks}.
 */
function addDocument(user, name, text) {
  if (!text || typeof text !== 'string') throw new Error('text required');
  const docs = loadDocs(user);
  const chunksText = chunkText(text);
  if (!chunksText.length) throw new Error('No content found in text');

  const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const doc = {
    id: docId,
    name: String(name || 'untitled').slice(0, 200),
    text: text.slice(0, 1_000_000), // cap stored raw text at 1MB
    uploadedAt: new Date().toISOString(),
    chunks: chunksText.map((t, i) => ({
      id: docId + '_c' + i,
      text: t,
      tfIdfVector: {}, // filled by rebuildVectors
    })),
  };
  docs.push(doc);

  const meta = rebuildVectors(docs);
  // Stash IDF per-user so search doesn't recompute it
  fs.writeFileSync(path.join(userDir(user), 'idf.json'), JSON.stringify(meta.idf), 'utf8');
  saveDocs(user, docs);

  return { docId, chunks: doc.chunks.length };
}

function _loadIdf(user) {
  const p = path.join(userDir(user), 'idf.json');
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return {}; }
}

/**
 * Cosine-similarity search over all of user's chunks.
 * Returns top-K [{docName, chunkText, score}].
 */
function searchUser(user, query, topK = 3) {
  const docs = loadDocs(user);
  if (!docs.length) return [];
  const idf = _loadIdf(user);
  const qVec = vectorizeQuery(query, idf);
  if (!qVec) return [];

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const vec = new Map(Object.entries(chunk.tfIdfVector || {}));
      const score = cosineSim(qVec, vec);
      if (score > 0) {
        scored.push({
          docId: doc.id,
          docName: doc.name,
          chunkText: chunk.text,
          score: Math.round(score * 10000) / 10000,
        });
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function listUserDocs(user) {
  return loadDocs(user).map(d => ({
    id: d.id,
    name: d.name,
    chunks: (d.chunks || []).length,
    uploadedAt: d.uploadedAt,
  }));
}

function deleteDocument(user, docId) {
  const docs = loadDocs(user);
  const idx = docs.findIndex(d => d.id === docId);
  if (idx === -1) return { ok: false, error: 'doc not found' };
  docs.splice(idx, 1);
  const meta = rebuildVectors(docs);
  fs.writeFileSync(path.join(userDir(user), 'idf.json'), JSON.stringify(meta.idf), 'utf8');
  saveDocs(user, docs);
  return { ok: true };
}

module.exports = {
  addDocument,
  searchUser,
  listUserDocs,
  deleteDocument,
  listNvidiaSkills,
  getNvidiaSkill,
  searchNvidiaSkills,
  // exposed for testing
  _internal: { tokenize, termFrequency, cosineSim, chunkText },
};
