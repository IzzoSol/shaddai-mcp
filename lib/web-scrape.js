// web-scrape.js — lightweight HTML scraper for the SHADDAI brain.
//
// MIT-style, zero-dependency (Node 18+ global fetch). Designed to be DROPPED IN
// for a heavier open-source engine later: set WEB_SCRAPER_SCRIPT=<abs path to a
// module exporting async scrape({url,maxChars})> and this lib routes through it.
// Built-in reader handles static HTML; JS-heavy pages will yield thin text.
//
// Security (PIKADON): https-only + SSRF guard — private/loopback/link-local and
// literal-IP hosts are rejected before any fetch.
'use strict';
const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 2_000_000;

function _own(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const t = ip.toLowerCase();
    if (t === '::1' || t === '::' || t.startsWith('fe80:') || t.startsWith('::ffff:127') || t.startsWith('fd') || t.startsWith('fc')) return true;
    if (t.startsWith('::ffff:10.')) return true;
    if (t.startsWith('::ffff:192.168.')) return true;
  }
  return false;
}

async function _assertPublic(hostname) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (_own(hostname)) throw new Error('scrape blocked: literal private IP');
    return;
  }
  let addrs = [];
  try { addrs = await dns.lookup(hostname, { all: true }); } catch (e) { throw new Error('scrape blocked: DNS lookup failed (' + e.code + ')'); }
  if (!addrs.length) throw new Error('scrape blocked: no addresses resolved');
  if (addrs.some((a) => _own(a.address))) throw new Error('scrape blocked: host resolves to a private address');
}

function _stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function _textOf(html) {
  const t = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|section|article)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–');
  return t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function _extract(html, base) {
  const t = _stripTags(html);
  const title = (t.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc = (t.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) || [])[1] || '';
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote|pre|td|dd)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while (m = re.exec(t)) {
    const part = _textOf(m[2]);
    if (part && part.length > 2) blocks.push((m[1] === 'li' ? '- ' : '') + part);
  }
  const seenL = new Set();
  const links = [];
  const lre = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;
  while (m = lre.exec(t)) {
    const href = m[1].trim();
    let abs = /^https?:\/\//i.test(href) ? href : (/^\//.test(href) ? base + href : base + '/' + href);
    abs = abs.split('#')[0];
    if (!seenL.has(abs) && /^https?:/i.test(abs)) { seenL.add(abs); links.push(abs); }
    if (links.length >= 40) break;
  }
  const joined = blocks.join('\n');
  return { title: _textOf(title), description: _textOf(desc), text: joined, links };
}

async function scrape(opts) {
  const url = String((opts && opts.url) || '').trim();
  const maxChars = Math.max(300, Number((opts && opts.maxChars) || 60000));
  const custom = process.env.WEB_SCRAPER_SCRIPT;
  if (custom) {
    let mod = null;
    try { mod = require(require('path').resolve(custom)); } catch (e) { throw new Error('WEB_SCRAPER_SCRIPT failed to load: ' + (e && e.message)); }
    if (mod && typeof mod.scrape === 'function') return mod.scrape({ url, maxChars });
  }
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('only https URLs are allowed');
  await _assertPublic(u.hostname);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), Number((opts && opts.timeoutMs) || 20000));
  let res;
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        'user-agent': (opts && opts.userAgent) || 'ShaddaiBrainBot/1.0 (+https://github.com/IzzoSol)',
        accept: 'text/html,text/plain;q=0.9,*/*;q=0.5',
        'accept-language': 'en',
      },
    });
  } finally { clearTimeout(timer); }
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  const ctype = String(res.headers.get('content-type') || '');
  if (res.headers.get('content-length') > MAX_BYTES) throw new Error('response too large');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('response too large');
  let html = buf.toString('utf8');
  const isHtml = /text\/html|application\/xhtml/i.test(ctype);
  const out = {
    url: url,
    finalUrl: res.url || url,
    title: '',
    description: '',
    text: '',
    links: [],
    scrapedAt: new Date().toISOString(),
    contentType: ctype,
  };
  if (!isHtml) {
    out.text = html.slice(0, maxChars);
    return out;
  }
  const ex = _extract(html, u.origin);
  out.title = ex.title || u.hostname;
  out.description = ex.description;
  out.text = ex.text.slice(0, maxChars);
  out.links = ex.links;
  return out;
}

function toMarkdown(r) {
  const lines = [];
  lines.push('# ' + (r.title || r.url));
  lines.push('');
  if (r.description) lines.push('> ' + r.description + '\n');
  lines.push('Source: ' + r.finalUrl + ' — scraped ' + r.scrapedAt.slice(0, 10));
  lines.push('');
  lines.push(String(r.text || '(no readable text)').trim());
  if (r.links && r.links.length) {
    lines.push('\n## Related links\n');
    for (const l of r.links.slice(0, 12)) lines.push('- ' + l);
  }
  return lines.join('\n');
}

module.exports = { scrape, toMarkdown, _assertPublic, _own, MAX_BYTES };