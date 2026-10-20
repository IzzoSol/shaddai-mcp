// PayBox / x402 micropayment core. Zero-dep on this machine:
//  • Solana Pay transfer-request URL is pure URL construction (no SDK).
//  • Payment verification reads getTransaction preTokenBalances/postTokenBalances
//    and compares the USDC delta on our receiver wallet — no SDK required.
// Intents persist to JSON. The MCP paywall is env-gated (see SHADDAI_ENABLE_PAYWALL).
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-intents.json');
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RPC = 'https://api.mainnet-beta.solana.com';

const PRICES_USDC = {
  zerox_market_scan: 0.50,
  zerox_price: 0.25,
  zerox_sentiment: 0.25,
  graph_context: 1.00,
  oracle_chart: 9.00,
  quill_rewrite: 1.00,
  pikadon_review: 2.00,
  turtle_brief: 3.00,
  workflow_run: 0.50,
};

function quote(tool) { return PRICES_USDC[String(tool || '')] || 0; }
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || { intents: {} }; } catch (_) { return { intents: {} }; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

function createIntent(tool, userId, amountOverride) {
  const amount = isFinite(Number(amountOverride)) ? Number(amountOverride) : quote(tool);
  if (amount <= 0) return { error: 'tool is free: ' + tool };
  const now = Date.now();
  const id = 'pay-' + cryptoRandom(12);
  const intent = {
    id, tool: String(tool || 'call'), user_id: String(userId || 'anonymous'),
    amount_usdc: Math.round(amount * 100) / 100,
    status: 'pending', created_at: new Date(now).toISOString(),
    expires_at: new Date(now + 15 * 60 * 1000).toISOString(), tx: null,
  };
  const d = load();
  d.intents[id] = intent;
  save(d);
  return { intent, payment_url: buildUrl(intent) };
}
function cryptoRandom(len) { let s = ''; const b = require('crypto').randomBytes(len * 2); for (let i = 0; i < len; i++) s += b[i].toString(16).padStart(2, '0'); return s.slice(0, len); }

function buildUrl(intent) {
  const wallet = String(process.env.VIRTUALS_SOL_WALLET || '').trim();
  if (!wallet) return null;
  const q = new URLSearchParams();
  q.set('amount', intent.amount_usdc.toFixed(2));
  q.set('memo', intent.id);
  q.set('label', 'SHADDAI');
  q.set('message', 'Pay for ' + intent.tool);
  q.set('spl-token', USDC_MINT);
  return 'solana:' + wallet + '?' + q.toString();
}

function getIntent(id) { return load().intents[id] || null; }
function paidByUser(userId) { return Object.values(load().intents).filter((i) => i.user_id === String(userId) && i.status === 'paid'); }

async function verifyTx(tx) {
  try {
    const r = await fetch(RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'pbox', method: 'getTransaction', params: [String(tx), { encoding: 'json' }] }), signal: AbortSignal.timeout(60000) });
    const j = await r.json();
    const res = j.result;
    if (!res) return { found: false, reason: 'transaction not found yet (simulation or wrong cluster?)' };
    if (res.meta && res.meta.err) return { found: true, ok: false, reason: 'transaction failed on-chain: ' + JSON.stringify(res.meta.err) };
    const wallet = String(process.env.VIRTUALS_SOL_WALLET || '').trim().toLowerCase();
    const keys = (res.transaction && res.transaction.message && res.transaction.message.accountKeys) || [];
    const byIndex = (list) => {
      const map = {};
      (list || []).forEach((b) => {
        const addr = String((keys[b.accountIndex] && (typeof keys[b.accountIndex] === 'string' ? keys[b.accountIndex] : keys[b.accountIndex].pubkey)) || '').toLowerCase();
        if (b.mint === USDC_MINT || b.mint.toLowerCase() === USDC_MINT) map[addr] = Number(b.uiTokenAmount && b.uiTokenAmount.uiAmount) || 0;
      });
      return map;
    };
    const pre = byIndex(res.meta && res.meta.preTokenBalances);
    const post = byIndex(res.meta && res.meta.postTokenBalances);
    const delta = (post[wallet] || 0) - (pre[wallet] || 0);
    return { found: true, ok: delta > 0.005, delta_usdc: Math.round(delta * 100) / 100, wallet };
  } catch (e) {
    return { found: false, reason: 'verify failed: ' + ((e && e.message) || e) };
  }
}

async function confirm(intentId, tx, ledger) {
  const intent = getIntent(intentId);
  if (!intent) return { ok: false, reason: 'intent not found: ' + intentId };
  if (intent.status === 'paid') return { ok: true, already: true, intent };
  if (new Date(intent.expires_at) < new Date()) return { ok: false, reason: 'intent expired — create a new one with x402_intent' };
  const reused = Object.values(load().intents).some((i) => i.tx === String(tx) && i.status === 'paid');
  if (reused) return { ok: false, reason: 'tx already redeemed on another intent (replay blocked)' };
  const v = await verifyTx(tx);
  if (!v.found || !v.ok) return { ok: false, reason: v.reason || 'payment not verified', delta_usdc: v.delta_usdc };
  intent.status = 'paid';
  intent.tx = String(tx);
  intent.paid_at = new Date().toISOString();
  const d = load();
  d.intents[intent.id] = intent;
  save(d);
  if (ledger) ledger.logReceipt({ instance_id: intent.user_id, caller: intent.user_id, tool: intent.tool, amount_usdc: intent.amount_usdc, note: 'x402:' + intent.id });
  return { ok: true, intent };
}

function expiryMs() { return 15 * 60 * 1000; }
module.exports = { USDC_MINT, PRICES_USDC, quote, createIntent, getIntent, paidByUser, verifyTx, confirm, buildUrl, expiryMs };