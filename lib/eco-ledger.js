// Platform ledger — append-only receipts with a platform cut split.
// Every paid call on any instance logs a receipt; the owner keeps (1-cut) and
// the hall keeps the rest. Payouts are separate and immutable.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-ledger.json');
const PLATFORM_CUT = 0.15;

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { receipts: [], payouts: [] }; } catch (_) { return { receipts: [], payouts: [] }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function logReceipt(r) {
  const amount = Number(r.amount_usdc);
  if (!isFinite(amount) || amount < 0) return { error: 'amount_usdc must be a number >= 0' };
  const cents = Math.round(amount * 100);
  const platformCents = Math.round(cents * PLATFORM_CUT);
  const ownerCents = cents - platformCents;
  const rec = {
    id: 'RX' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    caller: String(r.caller || ''),
    instance_id: String(r.instance_id || 'hall'),
    tool: String(r.tool || 'call'),
    amount_usdc: cents / 100,
    platform_cut_usdc: platformCents / 100,
    owner_cut_usdc: ownerCents / 100,
    note: String(r.note || ''),
  };
  const d = load();
  d.receipts.push(rec);
  if (!save(d)) return { error: 'could not persist ledger' };
  return rec;
}

function owed() {
  const d = load();
  const paid = {};
  d.payouts.forEach((p) => { paid[p.instance_id] = (paid[p.instance_id] || 0) + Number(p.amount_usdc || 0); });
  const tot = {};
  d.receipts.forEach((r) => {
    tot[r.instance_id] = (tot[r.instance_id] || 0) + (r.owner_cut_usdc || 0) - (paid[r.instance_id] || 0);
    if (paid[r.instance_id]) delete tot[r.instance_id];
  });
  return tot;
}

function pay(instance_id, amount_usdc, tx_signature) {
  const d = load();
  const p = { instance_id, amount_usdc: Math.round(Number(amount_usdc) * 100) / 100, tx_signature: String(tx_signature || ''), paid_at: new Date().toISOString() };
  d.payouts.push(p);
  if (!save(d)) return { error: 'could not persist payout' };
  return p;
}

function summary() {
  const d = load();
  const gross = d.receipts.reduce((s, r) => s + r.amount_usdc, 0);
  const cut = d.receipts.reduce((s, r) => s + r.platform_cut_usdc, 0);
  const owner = d.receipts.reduce((s, r) => s + r.owner_cut_usdc, 0);
  const perInstance = {};
  d.receipts.forEach((r) => { perInstance[r.instance_id] = perInstance[r.instance_id] || { calls: 0, gross: 0, owner: 0 }; perInstance[r.instance_id].calls += 1; perInstance[r.instance_id].gross += r.amount_usdc; perInstance[r.instance_id].owner += r.owner_cut_usdc; });
  return { receipts: d.receipts.length, gross, platform_cut: cut, owner_share: owner, per_instance: perInstance, payouts_made: d.payouts.length };
}

module.exports = { PLATFORM_CUT, logReceipt, owed, pay, summary };