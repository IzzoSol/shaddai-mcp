// Office Avenue — discoverable instance registry. Instances are "forged offices"
// that users spawn from the 7 templates and publish with their own prices.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-directory.json');

const TEMPLATES = [
  { id: 'hall',    name: 'HALL',    desc: 'Orchestration city hall',                       accent: '#f5c518', services: ['route'] },
  { id: 'zerox',   name: 'ZEROX',   desc: 'Revenue, markets & trading signals',            accent: '#38bdf8', services: ['market_scan', 'price', 'scan', 'signals'] },
  { id: 'oracle',  name: 'ORACLE',  desc: 'Research, charts & intelligence',               accent: '#a78bfa', services: ['research', 'chart', 'data'] },
  { id: 'quill',   name: 'QUILL',   desc: 'Writing, tone & copy',                          accent: '#f472b6', services: ['rewrite', 'copy', 'thread'] },
  { id: 'turtle',  name: 'TURTLE',  desc: 'Design, visuals & branding',                    accent: '#34d399', services: ['brief', 'design', 'logo'] },
  { id: 'nexus',   name: 'NEXUS',   desc: 'Engineering, data & systems',                   accent: '#fbbf24', services: ['plan', 'build', 'review'] },
  { id: 'pikadon', name: 'PIKADON', desc: 'Security, compliance & audit',                  accent: '#f87171', services: ['review', 'audit'] },
];

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { instances: {} }; } catch (_) { return { instances: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function register(inst) {
  if (!inst || !inst.id || !inst.templateId) return { error: 'instance needs id + templateId' };
  const t = TEMPLATES.find((x) => x.id === inst.templateId);
  const d = load();
  d.instances[inst.id] = {
    id: inst.id,
    name: String(inst.name || inst.templateId).slice(0, 60),
    templateId: inst.templateId,
    templateName: t ? t.name : inst.templateId,
    accent: t ? t.accent : '#9ca3af',
    owner: String(inst.owner || ''),
    description: String(inst.description || '').slice(0, 300),
    pricesUsdc: inst.pricesUsdc || {},
    services: t ? t.services : [],
    mcpEndpoint: '/mcp/' + inst.id,
    status: inst.status || 'live',
    registeredAt: d.instances[inst.id] ? d.instances[inst.id].registeredAt : new Date().toISOString(),
    calls: d.instances[inst.id] ? d.instances[inst.id].calls : 0,
  };
  if (!save(d)) return { error: 'could not persist directory' };
  return d.instances[inst.id];
}

function bumpCalls(id) { const d = load(); if (d.instances[id]) { d.instances[id].calls = (d.instances[id].calls || 0) + 1; save(d); } }
function unregister(id) { const d = load(); const hit = !!d.instances[id]; delete d.instances[id]; save(d); return { removed: hit }; }
function get(id) { const d = load(); return d.instances[id] || null; }
function listAll() { const d = load(); return Object.values(d.instances).filter((i) => i.status === 'live'); }
function byTemplate(templateId) { return listAll().filter((i) => i.templateId === templateId); }
function search(q) {
  const s = String(q || '').toLowerCase().trim();
  if (!s) return listAll();
  return listAll().filter((i) => (i.name + ' ' + i.description + ' ' + i.templateId + ' ' + JSON.stringify(i.services)).toLowerCase().includes(s));
}

// Interop hook: run a forge spawn AND publish it in one shot.
function registerOnSpawn(instance, pricesUsdc) {
  return register(instance) || {};
}

module.exports = { TEMPLATES, register, unregister, get, listAll, byTemplate, search, bumpCalls, registerOnSpawn };