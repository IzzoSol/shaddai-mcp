// Scheduler — zero-dep job loop with JSON persistence. Zero-dep so nothing
// depends on Redis/Postgres on this machine. Handlers are registered by the
// host process (mcp-unified wires zerox.watch etc.); pg-boss is a later swap.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-scheduler.json');
const handlers = {};
let timer = null;

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { jobs: {} }; } catch (_) { return { jobs: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function register(type, fn) { handlers[String(type)] = fn; }

function add(spec) {
  if (!spec || !spec.type) return { error: 'type required' };
  if (!handlers[spec.type]) return { error: 'no handler registered for type: ' + spec.type };
  const everyMs = Math.max(1000, Number(spec.every_ms) || 3600000);
  const at = spec.at ? new Date(spec.at) : null;
  const now = Date.now();
  const d = load();
  const job = {
    id: 'job-' + crypto.randomBytes(5).toString('hex'),
    type: String(spec.type),
    data: spec.data && typeof spec.data === 'object' ? spec.data : {},
    every_ms: everyMs,
    at: at && !isNaN(at.getTime()) ? at.toISOString() : null,
    enabled: spec.enabled !== false,
    next_run_at: at && !isNaN(at.getTime()) ? at.getTime() : now,
    last_run_at: null,
    last_result: null,
    last_error: null,
    fails: 0,
    created_at: new Date().toISOString(),
  };
  d.jobs[job.id] = job;
  save(d);
  return job;
}

function remove(jobId) { const d = load(); const hit = !!d.jobs[jobId]; delete d.jobs[jobId]; save(d); return { removed: hit }; }
function list(type) {
  const d = load();
  return Object.values(d.jobs).filter((j) => !type || j.type === type).sort((a, b) => (a.next_run_at || 0) - (b.next_run_at || 0));
}
function setEnabled(jobId, enabled) { const d = load(); const j = d.jobs[jobId]; if (!j) return { error: 'job not found' }; j.enabled = enabled === true || enabled === 'true'; save(d); return j; }

async function tick() {
  const d = load();
  const now = Date.now();
  const due = Object.values(d.jobs).filter((j) => j.enabled && j.next_run_at <= now);
  if (!due.length) return 0;
  let ran = 0;
  for (const j of due) {
    if (j.at && j.enabled === false) continue;
    const fn = handlers[j.type];
    j.last_run_at = new Date().toISOString();
    if (fn) {
      try {
        j.last_result = await fn(j.data, j);
        j.fails = 0;
      } catch (e) {
        j.last_error = String((e && e.message) || e);
        j.fails += 1;
      }
    } else {
      j.last_error = 'no handler for ' + j.type;
      j.fails += 1;
    }
    const base = j.at ? Date.parse(j.at) : now;
    j.next_run_at = base + j.every_ms;
    ran += 1;
  }
  save(d);
  return ran;
}

function start(ms) { if (timer) return; timer = setInterval(() => { tick().catch(() => {}); }, ms || 3000); if (timer.unref) timer.unref(); }
function stop() { if (timer) { clearInterval(timer); timer = null; } }

module.exports = { register, add, remove, list, setEnabled, tick, start, stop, handlers };