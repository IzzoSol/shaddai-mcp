// Skill transmission — an instance packages its history (patterns, snapshot,
// win rate) as a sellable Mastery Pack; fresh offices import it as a head start.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-mastery.json');

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { packs: {} }; } catch (_) { return { packs: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function create(pack) {
  if (!pack.instance_id) return { error: 'instance_id required' };
  if (!pack.name) return { error: 'name required' };
  const price = Number(pack.price_usdc);
  if (!isFinite(price) || price <= 0) return { error: 'price_usdc must be positive' };
  const rec = {
    id: 'pack-' + crypto.randomBytes(5).toString('hex'),
    instance_id: String(pack.instance_id),
    name: String(pack.name).slice(0, 60),
    description: String(pack.description || '').slice(0, 300),
    price_usdc: Math.round(price * 100) / 100,
    patterns: Array.isArray(pack.patterns) ? pack.patterns.slice(0, 200) : [],
    memory_snapshot: pack.memory_snapshot || {},
    win_rate: Number(pack.win_rate) || null,
    total_calls: Math.max(0, Number(pack.total_calls) || 0),
    royalty_to_creator_pct: 75,
    sales: 0, revenue_total_usdc: 0,
    created_at: new Date().toISOString(),
  };
  const d = load();
  d.packs[rec.id] = rec;
  save(d);
  return rec;
}

function list(instanceId) {
  const d = load();
  return Object.values(d.packs).filter((p) => !instanceId || p.instance_id === String(instanceId)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function get(id) { return load().packs[id] || null; }

function buy(packId, targetInstanceId) {
  const d = load();
  const p = d.packs[packId];
  if (!p) return { error: 'pack not found' };
  p.sales += 1;
  p.revenue_total_usdc = Math.round((p.revenue_total_usdc + p.price_usdc) * 100) / 100;
  const royalty = Math.round(p.price_usdc * (p.royalty_to_creator_pct / 100) * 100) / 100;
  save(d);
  return { pack: p, royalty_usdc: royalty, creators_share_pct: p.royalty_to_creator_pct, target_instance: String(targetInstanceId || '') };
}

module.exports = { create, list, get, buy };