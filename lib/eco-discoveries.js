// Collective memory — agents log findings (rug warnings, alphas, patterns) and
// other agents "cite" them. Citations raise reputation; context retrieval ranks
// relevant discoveries. This is the cross-instance learning layer.
const fs = require('fs');
const path = require('path');
const graph = require('./eco-graph');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-discoveries.json');

const TYPES = ['rug_warning', 'alpha', 'pattern', 'correlation'];
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { discoveries: {} }; } catch (_) { return { discoveries: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function logDiscovery(a) {
  const type = String(a.type || '').toLowerCase();
  if (!TYPES.includes(type)) return { error: 'type must be one of ' + TYPES.join(', ') };
  if (!a.agent_id) return { error: 'agent_id required' };
  const id = 'disc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = {
    id, agent_id: String(a.agent_id), type,
    target: String(a.target || ''),
    reason: String(a.reason || '').slice(0, 400),
    confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0.5)),
    timestamp: new Date().toISOString(),
    cites: [], rep_score: 0, was_correct: typeof a.was_correct === 'boolean' ? a.was_correct : null,
  };
  const d = load();
  d.discoveries[id] = rec;
  save(d);
  graph.upsertEntity(id, { type: 'discovery:' + type, name: String(a.agent_id) + ' → ' + String(a.target || a.type), facts: [rec.reason], tags: [type, a.target] });
  graph.addEdge(String(a.agent_id), 'made', id);
  if (a.target) graph.addEdge(id, 'flags', String(a.target));
  return rec;
}

function cite(discoveryId, citingAgentId) {
  const d = load();
  const rec = d.discoveries[discoveryId];
  if (!rec) return { error: 'discovery not found' };
  if (!citingAgentId) return { error: 'citing agent_id required' };
  if (!rec.cites.includes(String(citingAgentId))) rec.cites.push(String(citingAgentId));
  rec.rep_score = rec.cites.length * 2 + Math.round(rec.confidence * 10);
  rec.correctness = rec.was_correct === true ? +1 : rec.was_correct === false ? -1 : 0;
  if (rec.was_correct === true) rec.rep_score += 5;
  save(d);
  return rec;
}

function contextual(target) {
  const d = load();
  const hits = [];
  Object.values(d.discoveries).forEach((rec) => { if (rec.target === String(target)) hits.push(rec); });
  return hits.sort((a, b) => b.rep_score - a.rep_score || new Date(b.timestamp) - new Date(a.timestamp));
}

function all(type) {
  const d = load();
  return Object.values(d.discoveries).filter((r) => !type || r.type === type).sort((a, b) => b.rep_score - a.rep_score || new Date(b.timestamp) - new Date(a.timestamp));
}

function byAgent(agentId) { return Object.values(load().discoveries).filter((r) => r.agent_id === String(agentId)); }

module.exports = { TYPES, logDiscovery, cite, contextual, all, byAgent };