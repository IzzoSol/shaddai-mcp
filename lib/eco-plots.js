// Digital property — plots/jobs in the Bazaar, Oracle Tower, Nexus Hub arenas.
// Ownership is registrable now (paper); NFT minting + rent settlement hook later.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-plots.json');

const DISTRICTS = [
  { id: 'bazaar', name: 'Bazaar District', price_usdc: 100, rent_usdc: 0.50 },
  { id: 'oracle_tower', name: 'Oracle Tower', price_usdc: 250, rent_usdc: 1.25 },
  { id: 'nexus_hub', name: 'Nexus Hub', price_usdc: 175, rent_usdc: 0.90 },
  { id: 'arena', name: 'Arena', price_usdc: 400, rent_usdc: 2.00 },
];

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { plots: {}, next_id: 1 }; } catch (_) { return { plots: {}, next_id: 1 }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function createPlot(districtId, name, opts) {
  const district = DISTRICTS.find((x) => x.id === districtId);
  if (!district) return { error: 'unknown district: ' + districtId };
  const d = load();
  const plot = {
    id: 'plot-' + d.next_id++, district: districtId, district_name: district.name,
    name: String(name || districtId).slice(0, 60),
    price_usdc: isFinite(Number(opts && opts.price_usdc)) ? Number(opts.price_usdc) : district.price_usdc,
    monthly_rent_usdc: isFinite(Number(opts && opts.rent_usdc)) ? Number(opts.rent_usdc) : district.rent_usdc,
    status: 'available', owner: null, purchase_tx: null, purchased_at: null,
    tenants: [], visitors: 0, rent_collected_usdc: 0, created_at: new Date().toISOString(),
  };
  d.plots[plot.id] = plot;
  save(d);
  return plot;
}

function buy(plotId, owner, tx) {
  const d = load();
  const p = d.plots[plotId];
  if (!p) return { error: 'plot not found' };
  if (p.status !== 'available') return { error: 'plot already owned' };
  p.owner = String(owner);
  p.status = 'owned';
  p.purchase_tx = String(tx || 'paper');
  p.purchased_at = new Date().toISOString();
  save(d);
  return p;
}

function rent(plotId, instanceId) {
  const d = load();
  const p = d.plots[plotId];
  if (!p) return { error: 'plot not found' };
  if (p.status !== 'owned') return { error: 'plot must be owned before renting' };
  if (!p.tenants.includes(String(instanceId))) p.tenants.push(String(instanceId));
  save(d);
  return p;
}

function visit(plotId) {
  const d = load();
  const p = d.plots[plotId];
  if (!p) return { error: 'plot not found' };
  p.visitors += 1;
  const bonus = Math.floor(p.visitors / 100); // 0.10 per 100 visits, once
  if (bonus > p.visitors_bonus_paid) { p.rent_collected_usdc = Math.round((p.rent_collected_usdc + bonus * 0.10) * 100) / 100; p.visitors_bonus_paid = bonus; }
  save(d);
  return p;
}

function accrueRent() {
  const d = load();
  let collected = 0;
  Object.values(d.plots).forEach((p) => {
    if (p.status === 'owned') { p.rent_collected_usdc = Math.round((p.rent_collected_usdc + p.monthly_rent_usdc) * 100) / 100; collected += p.monthly_rent_usdc; }
  });
  save(d);
  return { collected_usdc: Math.round(collected * 100) / 100, owned: Object.values(d.plots).filter((p) => p.status === 'owned').length };
}

function list(districtId) {
  const d = load();
  return Object.values(d.plots).filter((p) => !districtId || p.district === districtId).sort((a, b) => a.id.localeCompare(b.id));
}

module.exports = { DISTRICTS, createPlot, buy, rent, visit, accrueRent, list };