// Workflow builder — no-code composable jobs. Steps reference the MCP tool names
// (zerox_price, graph_context, quill_rewrite...) and run against an injected
// runner (callTool), with {{step.result.field}} interpolation between steps.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-workflows.json');
let runner = null;
function setRunner(fn) { runner = fn; }

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { workflows: {} }; } catch (_) { return { workflows: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function create(def) {
  if (!def.name) return { error: 'name required' };
  const steps = Array.isArray(def.steps) ? def.steps.map((s, i) => ({ step: i + 1, tool: String(s.tool || s.agent || ''), args: s.args || {}, on_fail: s.on_fail || 'stop' })) : [];
  if (!steps.length) return { error: 'steps[] required (each {tool, args})' };
  const rec = {
    id: 'wf-' + crypto.randomBytes(5).toString('hex'),
    name: String(def.name).slice(0, 60),
    description: String(def.description || '').slice(0, 300),
    price_usdc: Math.max(0, Number(def.price_usdc) || 0),
    status: def.published ? 'published' : 'draft',
    creator: String(def.creator || ''),
    steps, created_at: new Date().toISOString(),
  };
  const d = load();
  d.workflows[rec.id] = rec;
  save(d);
  return rec;
}

function publish(id) { const d = load(); const w = d.workflows[id]; if (!w) return { error: 'workflow not found' }; w.status = 'published'; save(d); return w; }
function list() { return Object.values(load().workflows).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); }
function get(id) { return load().workflows[id] || null; }

function interpolate(template, results) {
  if (Array.isArray(template)) return template.map((x) => interpolate(x, results));
  if (template && typeof template === 'object') { const o = {}; Object.keys(template).forEach((k) => { o[k] = interpolate(template[k], results); }); return o; }
  if (typeof template === 'string') {
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (m, key) => {
      const v = lookup(results, key.trim());
      return v === undefined ? m : String(v);
    });
  }
  return template;
}
function lookup(obj, key) {
  let cur = obj;
  for (const part of key.split('.')) { if (cur == null) return undefined; cur = cur[part]; }
  return cur;
}

async function run(id, context) {
  if (!runner) return { error: 'workflow runner not set' };
  const w = get(id);
  if (!w) return { error: 'workflow not found: ' + id };
  const exec = { workflow_id: id, name: w.name, status: 'running', started_at: new Date().toISOString(), steps_completed: 0, results: {}, step_results: [] };
  for (const step of w.steps) {
    try {
      const args = interpolate(step.args, exec.results);
      const out = await runner(step.tool, args);
      const rec = { step: step.step, tool: step.tool, output: String(out) };
      exec.step_results.push(rec);
      exec.results['step_' + step.step] = { tool: step.tool, output: String(out) };
      exec.steps_completed += 1;
    } catch (e) {
      exec.step_results.push({ step: step.step, tool: step.tool, error: String((e && e.message) || e) });
      if (step.on_fail === 'continue') continue;
      exec.status = 'failed';
      break;
    }
  }
  if (exec.status === 'running') exec.status = 'completed';
  exec.finished_at = new Date().toISOString();
  return exec;
}

module.exports = { setRunner, create, publish, list, get, run, interpolate };