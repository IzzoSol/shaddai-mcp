// AURA-lite knowledge graph — tiny entity/edge store with BFS neighborhoods.
// Zero deps, JSON on disk. Good to ~100k edges; audit-friendly by hand.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-graph.json');

function load() {
  try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); return { entities: d.entities || {}, edges: d.edges || [] }; }
  catch (_) { return { entities: {}, edges: [] }; }
}
function save(g) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(g, null, 2)); return true; } catch (_) { return false; } }

function upsertEntity(id, data) {
  const g = load();
  g.entities[id] = {
    id, type: data.type || 'unknown', name: data.name || id,
    facts: data.facts || [],
    tags: data.tags || [],
    updated_at: new Date().toISOString(),
  };
  save(g);
  return g.entities[id];
}

function addEdge(fromId, relation, toId) {
  const g = load();
  const e = { from: fromId, relation, to: toId, added_at: new Date().toISOString() };
  if (!g.edges.some((x) => x.from === fromId && x.relation === relation && x.to === toId)) { g.edges.push(e); save(g); }
  return e;
}

function outgoing(id) { return load().edges.filter((e) => e.from === id); }
function incoming(id) { return load().edges.filter((e) => e.to === id); }

function neighborhood(startId, maxDepth) {
  const g = load();
  const depth = Math.max(0, Number(maxDepth) || 2);
  const seen = new Set([startId]);
  const queue = [{ id: startId, depth: 0, path: [startId] }];
  const out = [];
  while (queue.length) {
    const { id, depth: d, path } = queue.shift();
    if (d > depth) continue;
    out.push({ id, depth: d, path, entity: g.entities[id] || null, via: path.length > 1 ? g.edges.find((e) => e.from === path[path.length - 2] && e.to === id) : null });
    g.edges.filter((e) => e.from === id && !seen.has(e.to)).forEach((e) => { seen.add(e.to); queue.push({ id: e.to, depth: d + 1, path: path.concat([e.to]) }); });
  }
  return out;
}

module.exports = { upsertEntity, addEdge, outgoing, incoming, neighborhood };