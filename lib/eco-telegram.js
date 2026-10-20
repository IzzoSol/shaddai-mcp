// Telegram spine — one @ShaddaiHall bot, users bind chat_id. Zero-dep (raw
// fetch to api.telegram.org). Auto-loads TELEGRAM_BOT_TOKEN + TELEGRAM_HALL_CHAT_ID
// from backend/.env. Everything degrades to a clear note when no token is set.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const BINDS = path.join(DATA, 'eco-telegram.json');

(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '..', 'backend', '.env');
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line.trim());
        if (m && /^(TELEGRAM_)/.test(m[1]) && (process.env[m[1]] === undefined || process.env[m[1]] === '')) {
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          process.env[m[1]] = v;
        }
      }
    }
  } catch (_) {}
})();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const HALL = process.env.TELEGRAM_HALL_CHAT_ID || '';
// Virtuals agent has its OWN bot + chat, separate from the Hall/trading bot, so
// ZEROX's onchain activity can broadcast without colliding with the signals feed.
const VTOKEN = process.env.VIRTUALS_TELEGRAM_BOT_TOKEN || '';
const VCHAT = process.env.VIRTUALS_TELEGRAM_CHAT_ID || '';
function ready() { return TOKEN ? null : 'TELEGRAM_BOT_TOKEN not set (put it in backend/.env). Sending to Telegram disabled.'; }
function vReady() { return VTOKEN ? null : 'VIRTUALS_TELEGRAM_BOT_TOKEN not set (put it in backend/.env).'; }
async function postTo(token, id, text) {
  if (!token || !id) return { error: 'no token/chat — pass chat_id or set the matching env var' };
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: id, text: String(text).slice(0, 4000), parse_mode: 'Markdown', disable_web_page_preview: true }), signal: AbortSignal.timeout(60000) });
    const j = await r.json().catch(() => ({}));
    return j.ok ? { ok: true, chat_id: id, message_id: j.result && j.result.message_id } : { error: 'telegram returned: ' + JSON.stringify(j).slice(0, 200) };
  } catch (e) { return { error: 'telegram post failed: ' + ((e && e.message) || e) }; }
}
// Post to the Virtuals agent's bot/channel (ZEROX activity, logs, signals).
async function vPost(text, chatId) {
  const err = vReady(); if (err) return { error: err };
  const id = chatId || VCHAT;
  if (!id) return { error: 'no Virtuals chat target — pass chat_id or set VIRTUALS_TELEGRAM_CHAT_ID' };
  return postTo(VTOKEN, id, text);
}
function bind(userId, chatId) {
  const d = loadBinds();
  d.chats[String(userId)] = { chat_id: String(chatId), bound_at: new Date().toISOString() };
  saveBinds(d);
  return d.chats[String(userId)];
}
function chatFor(userId) {
  const d = loadBinds();
  return (d.chats[String(userId)] && d.chats[String(userId)].chat_id) || HALL || null;
}
function loadBinds() { try { return JSON.parse(fs.readFileSync(BINDS, 'utf8')) || { chats: {} }; } catch (_) { return { chats: {} }; } }
function saveBinds(d) { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(BINDS, JSON.stringify(d, null, 2)); return true; } catch (_) { return false; } }

async function post(text, chatId) {
  const err = ready();
  if (err) return { error: err };
  const id = chatId || HALL;
  if (!id) return { error: 'no chat target — pass chat_id or set TELEGRAM_HALL_CHAT_ID, or bind a user via hall_bind' };
  return postTo(TOKEN, id, text);
}

const AGENT_EMOJI = {
  SHADDAI: '👑', NEXUS: '⚙️', ZEROX: '💰', ORACLE: '🔮',
  TURTLE: '🎨', QUILL: '✍️', PIKADON: '🛡️',
};

// One @ShaddaiHall, tagged results. Post an agent's tool result to the Hall, and
// (when a bound DM chat is provided) echo a copy to that user. Degrades cleanly
// when no token/chat is configured — returns the post result (or {error}) instead
// of throwing, like every other fn here.
async function postAgentResult(agentName, toolName, result, { sender = null, dmChatId = null } = {}) {
  const err = ready();
  if (err) return { error: err };

  const name = String(agentName || '').toUpperCase();
  const emoji = AGENT_EMOJI[name] || '🤖';
  const heading = `${emoji} *${name}* — ${toolName}`;

  const formatted = typeof result === 'object'
    ? '```json\n' + JSON.stringify(result, null, 2).slice(0, 3500) + '\n```'
    : '_' + String(result) + '_';

  const hallMessage = `${heading}\n\n${formatted}${sender ? `\n\n_via tip: ${String(sender).slice(0, 8)}…_` : ''}`;
  const hallResult = await post(hallMessage, HALL);

  let dmResult = null;
  if (dmChatId) dmResult = await postTo(TOKEN, dmChatId, `${heading}\n\n${formatted}`);

  return { hall: hallResult, dm: dmResult };
}

module.exports = { ready, vReady, bind, chatFor, post, vPost, postTo, postAgentResult, HALL, TOKEN, VTOKEN, VCHAT, AGENT_EMOJI };