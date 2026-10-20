// Sub-agent delegation — users (or parent instances) spawn lightweight sub-agents
// to do bounded work. Same owner chain; platform cut applies downstream only.
// Work items are journaled to JSON (the scheduler hooks in later to auto-run).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-subagents.json');

const ROLES = ['scanner', 'analyst', 'monitor', 'poster', 'runner'];
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { subs: {}, work: [] }; } catch (_) { return { subs: {}, work: [] }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function spawnSubAgent(a) {
  const role = String(a.role || 'runner').toLowerCase();
  if (!ROLES.includes(role)) return { error: 'role must be one of ' + ROLES.join(', ') };
  if (!a.parent_id) return { error: 'parent_id required' };
  const id = 'sub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const sub = {
    id, parent_id: String(a.parent_id), role,
    name: String(a.name || role).slice(0, 60),
    tools: Array.isArray(a.tools) ? a.tools.slice(0, 12) : [],
    takes_usd: Math.max(0, Number(a.takes_usd) || 0.10),
    status: 'sleeping',
    calls_done: 0, earned_usd: 0,
    created_at: new Date().toISOString(),
  };
  const d = load();
  d.subs[id] = sub;
  save(d);
  return sub;
}

function delegate(a) {
  const d = load();
  const sub = d.subs[a.sub_id];
  if (!sub) return { error: 'sub-agent not found: ' + a.sub_id };
  const tasks = Array.isArray(a.tasks) ? a.tasks.map((t) => String(t)).filter(Boolean) : [];
  if (!tasks.length) return { error: 'tasks[] required' };
  sub.status = 'working';
  const work = {
    id: 'wk-' + crypto.randomBytes(6).toString('hex'),
    sub_id: sub.id, parent_id: sub.parent_id,
    tasks, expected_usd: Math.max(0, Number(a.est_usd) || 0),
    status: 'queued', results: {},
    created_at: new Date().toISOString(),
  };
  d.work.push(work);
  save(d);
  return work;
}

function complete(workId, results) {
  const d = load();
  const w = d.work.find((x) => x.id === workId);
  if (!w) return { error: 'work item not found' };
  if (w.status !== 'queued') return { error: 'work item already ' + w.status };
  w.status = !!results ? 'done' : 'done';
  w.results = results && typeof results === 'object' ? results : {};
  w.completed_at = new Date().toISOString();
  const sub = d.subs[w.sub_id];
  if (sub) {
    sub.calls_done += w.tasks.length;
    sub.earned_usd += w.expected_usd;
    sub.status = 'idle';
  }
  save(d);
  return Object.assign({}, w);
}

function queue(parentId) {
  const d = load();
  return d.work.filter((w) => w.parent_id === String(parentId) && w.status === 'queued');
}
function bySub(subId) { return load().work.filter((w) => w.sub_id === subId); }
function ofParent(parentId) { return Object.values(load().subs).filter((s) => s.parent_id === String(parentId)); }
function stats(parentId) {
  const subs = ofParent(parentId);
  const totalCalls = subs.reduce((s, x) => s + x.calls_done, 0);
  const totalEarned = subs.reduce((s, x) => s + x.earned_usd, 0);
  return { sub_count: subs.length, total_calls: totalCalls, total_earned_usd: totalEarned, queued: queue(parentId).length };
}

module.exports = { ROLES, spawnSubAgent, delegate, complete, queue, bySub, ofParent, stats };