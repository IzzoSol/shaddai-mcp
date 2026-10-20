// External agent bridge — Grok/Fable/Claude bots can live in SHADDAI as
// registered agents. Calls are POSTed to their JSON endpoint and the split is
// recorded. Endpoints must be https — PIKADON rule, no exceptions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-bridge.json');
const SPLIT = { external_owner: 0.50, platform: 0.15, coordination_premium: 0.35 };

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { agents: {} }; } catch (_) { return { agents: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function register(a) {
  if (!a.id) return { error: 'id required' };
  if (!/^https:\/\//.test(String(a.url || ''))) return { error: 'url must be https (PIKADON rule)' };
  const d = load();
  const agent = {
    id: String(a.id), name: String(a.name || a.id).slice(0, 60),
    platform: String(a.platform || 'custom'), url: String(a.url), status: 'live',
    tools: Array.isArray(a.tools) ? a.tools : [],
    prices_usdc: a.prices_usdc || {}, split: SPLIT,
    created_at: d.agents[a.id] ? d.agents[a.id].created_at : new Date().toISOString(),
    calls: d.agents[a.id] ? d.agents[a.id].calls : 0,
  };
  d.agents[agent.id] = agent;
  save(d);
  return agent;
}

function get(id) { return load().agents[id] || null; }
function listAll() { return Object.values(load().agents); }

async function callAgent(id, tool, params) {
  const agent = get(id);
  if (!agent) return { error: 'external agent not registered: ' + id };
  const url = agent.url.replace(/\/+$/, '') + '/' + encodeURIComponent(String(tool));
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params || {}), signal: AbortSignal.timeout(60000) });
    const text = await r.text().catch(() => '');
    let j = null; try { j = text ? JSON.parse(text) : null; } catch (_) { j = { raw: text }; }
    const d = load();
    d.agents[id].calls += 1;
    save(d);
    const price = Number(agent.prices_usdc[tool]) || 0;
    return {
      status: r.status, ok: r.ok, result: j,
      billing: price > 0 ? { amount_usdc: price, split: SPLIT, split_hint: 'platform 15%, external owner 50%, coordination premium 35%' } : null,
    };
  } catch (e) {
    return { error: 'external call failed: ' + ((e && e.message) || e) };
  }
}

module.exports = { register, get, listAll, callAgent, SPLIT };