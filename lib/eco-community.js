// eco-community.js — SHADDAI Hall community economy as MCP tools.
//
// Pilots the SAME wallet store the Telegram family uses (backend/lib/tg-community):
// sparks, daily bonus, quests, referral, arcade, signals conviction. Every MCP
// client (Claude, Cursor, Copilot) and every bot in the Hall read/write one
// store, so a gem earned in a chat shows up under the same uid here.
//
// Paper currency only. No real money, no withdraws. Outcomes are server-side
// and audited inside tg-community.
'use strict';
const path = require('path');

let com = null;
try { com = require(path.join(__dirname, '..', '..', 'backend', 'lib', 'tg-community.js')); } catch (e) { com = null; }

function _need() { return com || { err: () => 'community engine unavailable' }; }
function _esc(s) { return String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); }

function profile(uid) {
  if (!com) return 'community engine unavailable';
  const u = com.sparks(uid);
  if (!u) return 'that uid is not registered yet.';
  return [
    '⚡ Spark wallet for ' + _esc(uid),
    '  sparks: ' + u.sparks + ' · score: ' + u.score + ' pts',
    '  streak: ' + u.streak + ' · plays: ' + u.plays + ' · wins: ' + u.wins + ' · best: ' + u.best,
    '  invites: ' + (u.referees === undefined ? 0 : u.referees) + ' · referral code: ' + (u.code ? _esc(u.code) : 'none yet'),
    '  referred by: ' + (_esc(u.referredBy) || '—'),
    '  bonus free brain-asks/day: ' + (u.asksBonus || 0),
  ].join('\n');
}
function dailyBonus(uid) {
  if (!com) return 'community engine unavailable';
  const r = com.dailyBonus(uid);
  return r.ok ? '💰 +' + r.bonus + ' sparks daily refill claimed — now ' + r.sparks + ' ⚡.' : '🔁 Already claimed today. Come back tomorrow (or claim a referral for a bigger bonus).';
}
function runQuests(uid) {
  if (!com) return 'community engine unavailable';
  const r = com.quest(uid);
  if (!r.ok) {
    if (r.already) return '✅ Quest bank empty for today — balance ' + r.sparks + ' ⚡. New bank tomorrow.';
    if (r.message) return '🎯 Quest bank (roll any bet +10 · win +20 · invite +25): ' + r.message;
    return 'quests unavailable';
  }
  return '🎯 COMPLETE! +' + r.bonus + ' ⚡\n' + (r.parts || []).map((p) => '  ✅ ' + p.label + ' → +' + p.bonus).join('\n') + '\nBalance now: ' + r.sparks + ' ⚡';
}
function referral(uid, botUsername) {
  if (!com) return 'community engine unavailable';
  const link = com.linkFor(uid, botUsername);
  if (!link) return 'could not issue a referral code for ' + _esc(uid);
  const u = com.sparks(uid) || {};
  return [
    '🎁 Referral key for ' + _esc(uid) + ' (invites earned: ' + (u.referees === undefined ? 0 : u.referees) + ')',
    '  link: ' + link,
    '  code: ' + (u.code && _esc(u.code)),
    '  every friend who joins via it → you get +100 sparks + +2 free brain-asks/day; they get +50.',
  ].filter(Boolean).join('\n');
}
function claim(uid, code) {
  if (!com) return 'community engine unavailable';
  const r = com.claim(uid, code);
  return r.ok ? '🎁 Referral accepted — +50 ⚡ to you; your host now has ' + r.inviterReferrers + ' invite(s) and ' + r.referrerSparks + ' ⚡.' : '⚠️ ' + _esc(r.error || 'could not claim');
}
function convict(uid, symbol, amount) {
  if (!com) return 'community engine unavailable';
  const r = com.convict(uid, symbol, Number(amount) || 0);
  return r.ok
    ? '🔥 CONVICTION: ' + _esc(r.symbol) + ' +' + r.amount + ' ⚡ · pool ' + r.poolSparks + ' · ' + r.votes + ' voters · your wallet ' + r.sparks
    : '⚠️ ' + _esc(r.error || 'can\u2019t vote');
}
function hot(n) {
  if (!com) return 'community engine unavailable';
  const rows = com.hot(Number(n) || 10);
  if (!rows.length) return 'No conviction pools yet — back a call with hall_conviction.';
  return rows.map((r, i) => (i + 1) + '. ' + _esc(r.symbol) + ' — ' + (r.sparks || 0).toLocaleString() + ' ⚡ · ' + r.votes + ' voters').join('\n');
}
function leaderboard() {
  if (!com) return 'community engine unavailable';
  const lines = ['🏆 SHADDAI LEADERBOARD'];
  const sc = com.topPlayers(5);
  lines.push('Top scorers:');
  sc.forEach((r, i) => lines.push('  ' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') + ' ' + _esc(r.uid.slice(0, 14)) + ' — ' + (r.score || 0).toLocaleString() + ' pts'));
  const rf = com.topReferrers(5);
  lines.push('Top referrers:');
  rf.forEach((r, i) => lines.push('  ' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.') + ' ' + _esc(r.uid.slice(0, 14)) + ' — ' + r.invites + ' invite(s)'));
  const ht = com.hot(5);
  if (ht.length) lines.push('Hottest calls: ' + ht.map((r) => _esc(r.symbol) + ' ' + (r.sparks || 0).toLocaleString() + '⚡').join(' · '));
  return lines.join('\n');
}
function stats() {
  if (!com) return 'community engine unavailable';
  const s = com.stats();
  return 'Community: ' + s.users + ' souls · ' + s.plays + ' plays · ' + s.wins + ' wins · ' + s.referrers + ' referrers · top score ' + s.topScore.toLocaleString() + ' pts · ' + s.sparks.toLocaleString() + ' ⚡ in wallets.';
}
function arcade(uid, game, bet) {
  if (!com) return 'community engine unavailable';
  const r = com.arcadeResult(String(game || 'basketball'), 'SHADDAI');
  const s = com.settleBet(uid, Number(bet) || 10, r);
  if (!s.ok) return '⚠️ ' + _esc(s.error || 'can\u2019t play');
  return (s.win ? '🟢 WIN +' + s.payout : '🔴 LOSS −' + (Number(bet) || 10)) + ' ⚡ · ' + _esc(r.detail || '') + '\n' + 'wallet: ' + s.sparks + ' ⚡ · score: ' + s.score;
}
function arena(uid, a, b, bet) {
  if (!com) return 'community engine unavailable';
  const r = com.arena(uid, String(a || ''), String(b || ''), Number(bet) || 10);
  if (!r.ok) return '⚠️ ' + _esc(r.error || 'arena unavailable');
  const lines = ['⚔️ ARENA — ' + r.a + ' vs ' + r.b];
  for (const rd of r.rounds) lines.push('  R' + rd.r + '  ' + rd[a] + ' — ' + rd[b] + '  (' + rd.j + ')');
  lines.push('  FINAL ' + r.scoreA + ' : ' + r.scoreB + ' → 🏆 ' + r.winner);
  lines.push(r.won ? '  ✅ you bet ' + r.bet + ' on ' + r.a + ' — payout ' + r.payout + ' ⚡ (wallet ' + r.sparks + ')' : '  ❌ your pick lost — −' + r.bet + ' ⚡ (wallet ' + r.sparks + ')');
  return lines.join('\n');
}
function arenaHistory(n) {
  if (!com) return 'community engine unavailable';
  const rows = com.arenaHistory(Number(n) || 5);
  if (!rows.length) return 'No arena bouts yet — fight two agents with hall_arena.';
  return rows.map((b) => b.a + ' vs ' + b.b + ' · ' + b.scoreA + ':' + b.scoreB + ' → ' + b.winner + ' · bet ' + b.bet + ' · ' + new Date(b.ts).toISOString().slice(0, 16) + 'Z').join('\n');
}

// ── ORACLE astrology ─────────────────────────────────────────────────────────
const SIGNS = {
  aries: { el: '🔥 Fire', ruler: 'Mars', sym: '♈' }, taurus: { el: '🌍 Earth', ruler: 'Venus', sym: '♉' },
  gemini: { el: '🌬 Air', ruler: 'Mercury', sym: '♊' }, cancer: { el: '💧 Water', ruler: 'Moon', sym: '♋' },
  leo: { el: '🔥 Fire', ruler: 'Sun', sym: '♌' }, virgo: { el: '🌍 Earth', ruler: 'Mercury', sym: '♍' },
  libra: { el: '🌬 Air', ruler: 'Venus', sym: '♎' }, scorpio: { el: '💧 Water', ruler: 'Pluto', sym: '♏' },
  sagittarius: { el: '🔥 Fire', ruler: 'Jupiter', sym: '♐' }, capricorn: { el: '🌍 Earth', ruler: 'Saturn', sym: '♑' },
  aquarius: { el: '🌬 Air', ruler: 'Uranus', sym: '♒' }, pisces: { el: '💧 Water', ruler: 'Neptune', sym: '♓' },
};
const MOONS = ['🌑 New Moon', '🌒 Waxing Crescent', '🌓 First Quarter', '🌔 Waxing Gibbous', '🌕 Full Moon', '🌖 Waning Gibbous', '🌗 Last Quarter', '🌘 Waning Crescent'];
function moonPhase() {
  const SYN = 29.53058867;
  const NEW_1970 = 2440587.5 - 2442000.0;
  const days = Date.now() / 86400000 - NEW_1970;
  const p = ((days % SYN) / SYN);
  return { phase: MOONS[Math.floor(p * 8 + 0.5) % 8], illum: Math.round((1 - Math.cos(p * 2 * Math.PI)) / 2 * 100) };
}
function _hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i); return h >>> 0; }
const HORO_LINES = [
  'a strong push today wants a clean target — pick one and swing for it',
  'old plans get a second life; revisit the draft you shelved, it was right',
  'someone\u2019s silence is a signal — read the room before you commit',
  'money energy is quiet, not dead — move slow, move sure, let it pile',
  'a creative spark lands mid-day; catch it before the noise eats it',
  'temper the throttle — one impulsive message too many and a deal sours',
  'collaboration outguns solo today; bring the guild into the loop',
  'the moon sides with patience — plant today, harvest inside the week',
];
function astro(sign) {
  const key = String(sign || '').toLowerCase().trim() || 'aries';
  const s = SIGNS[key];
  if (!s) return _esc(sign) + ' is not a sign. Pick: ' + Object.keys(SIGNS).join(', ').replace(/\b(\w+\b)/g, (w, i) => w);
  const moon = moonPhase();
  const seed = _hash(key + ':' + new Date().toISOString().slice(0, 10));
  const line = HORO_LINES[seed % HORO_LINES.length];
  const luck = 35 + (seed % 56);
  return [s.sym + ' ' + String(key).replace(/^./, (c) => c.toUpperCase()),
    '  element: ' + s.el + ' · ruler: ' + s.ruler,
    '  ' + moon.phase + ' · moon ' + moon.illum + '% lit',
    '  ORACLE: ' + line + '.',
    '  cosmic luck today: ' + luck + '/90 · grounded > clever for the next ' + (2 + (seed % 3)) + ' days.',
  ].join('\n');
}
// ── Turtle music spec ───────────────────────────────────────────────────────
let mg = null;
try { mg = require(path.join(__dirname, '..', '..', 'backend', 'lib', 'music-gen-node.js')); } catch (e) { mg = null; }
function musicspec(genre, bars) {
  if (!mg) return 'music engine unavailable';
  const gk = mg.pickGenre(String(genre || '')) || 'lofi';
  const n = Math.max(2, Math.min(16, Number(bars) || 8));
  try {
    const meta = mg.generate({ genre: gk, bars: n, durationSeconds: 34 }).meta;
    return ['🐢 Turtle Music spec — ' + meta.genreName + ' · ' + meta.bpm + ' BPM · ' + meta.seconds + 's (' + n + ' bars)',
      '  mood: ' + (meta.mood || '—'), '  generated 16-bit WAV, streaming-ready (supports_streaming).',
      '  listen in Telegram: /music ' + gk + ' ' + n + ' · MCP recomposes the same spec on request.',
    ].join('\n');
  } catch (e) { return 'music spec failed: ' + e.message; }
}

module.exports = { profile, dailyBonus, runQuests, referral, claim, convict, hot, leaderboard, stats, arcade, arena, arenaHistory, astro, musicspec, moonPhase };