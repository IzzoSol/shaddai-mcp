// Free-tier quota — N free tool calls per user per day, then 402.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA, 'eco-quota.json');
const FREE_TIER_DAILY_CALLS = 5;

function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { return {}; } }
function save(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }
function today() { return new Date().toISOString().split('T')[0]; }
function key(userId) { return String(userId || 'anonymous') + '|' + today(); }
function usageToday(userId) { return load()[key(userId)] || 0; }
function hasFreeCalls(userId) { return usageToday(userId) < FREE_TIER_DAILY_CALLS; }
function consume(userId) {
  const d = load();
  const k = key(userId);
  d[k] = (d[k] || 0) + 1;
  save(d);
  return FREE_TIER_DAILY_CALLS - d[k];
}

module.exports = { FREE_TIER_DAILY_CALLS, usageToday, hasFreeCalls, consume };