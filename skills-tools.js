'use strict';
// Curated SKILL tools - real, hand-authored methodologies from the SHADDAI
// Obsidian skills catalog, exposed as callable MCP tools. Each description
// carries the "when to use" trigger so an agent picks the right skill; the
// full methodology is returned on call.
const fs = require('fs');
const path = require('path');

const CATALOG_CANDIDATES = [
  path.join(__dirname, 'data', 'skills-catalog.json'),
  path.join(__dirname, '..', 'backend', 'data', 'skills-catalog.json'),
  'C:/Users/Brittany/Shaddai-Beta/backend/data/skills-catalog.json',
];

let _catalog = null;
function catalog() {
  if (_catalog) return _catalog;
  for (const p of CATALOG_CANDIDATES) {
    try {
      if (fs.existsSync(p)) {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        const all = j.skills || [];
        _catalog = { byId: Object.fromEntries(all.map(s => [s.id, s])), all: all };
        return _catalog;
      }
    } catch (e) { /* try next */ }
  }
  _catalog = { byId: {}, all: [] };
  return _catalog;
}

function skillBody(sid) {
  const s = catalog().byId[sid];
  if (!s) return 'Skill not found: ' + sid + '. Use skill_search to find skills.';
  const out = [];
  out.push('SKILL: ' + s.id + '  (agent: ' + (s.agent || 'SHADDAI') + ', category: ' + (s.category || 'Skills') + ')');
  if (s.description) out.push('\nWHEN TO USE:\n' + s.description.slice(0, 1500));
  const meth = s.methodology || '';
  if (meth) {
    out.push('\nMETHODOLOGY:\n' + meth.slice(0, 9000) + (meth.length > 9000 ? '\n...[truncated ' + (meth.length - 9000) + ' chars]' : ''));
  }
  return out.join('\n');
}

function skillSearch(query, limit) {
  const lim = Math.min(Number(limit) || 10, 30);
  const all = catalog().all;
  if (!all.length) return 'Skills catalog not loaded.';
  const cm = require('./concept-map');
  const words = cm.expandQuery(query);
  const raw = String(query || '').toLowerCase();
  const hits = all.map(s => {
    const hay = (' ' + (s.description || '') + ' ' + s.id + ' ' + (s.category || '') + ' ' + (s.agent || '') + ' ').toLowerCase();
    let score = 0;
    let matched = [];
    for (const w of words) {
      if (hay.indexOf(w) !== -1) { score += 1; matched.push(w); }
    }
    // exact phrase in the description is a strong signal
    if (raw.length > 3 && hay.indexOf(raw) !== -1) score += 3;
    // the skill id itself matching is strongest
    if (String(s.id).toLowerCase().indexOf(raw) !== -1 && raw.length > 2) score += 5;
    return { s: s, score: score, matched: matched };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, lim);
  if (!hits.length) return 'No skills match "' + query + '". Try broader wording.';
  return hits.map(x => '- ' + x.s.id + ' [' + (x.s.agent || '') + '/' + (x.s.category || '') + '] score=' + x.score + ' | ' + String(x.s.description || '').split(' ').slice(0, 18).join(' ')).join('\n');
}

// Recommend the best skills for a TASK (intent -> skill). Uses the concept map
// so "making a commercial" surfaces cinematography/UGC/video skills.
function skillRecommend(task, limit) {
  const lim = Math.min(Number(limit) || 8, 20);
  const all = catalog().all;
  if (!all.length) return 'Skills catalog not loaded.';
  const cm = require('./concept-map');
  const words = cm.expandQuery(task);
  const scored = all.map(s => {
    const desc = String(s.description || '').toLowerCase();
    const id = String(s.id).toLowerCase();
    const cat = String(s.category || '').toLowerCase();
    let score = 0;
    const why = [];
    for (const w of words) {
      if (desc.indexOf(w) !== -1) { score += 1; if (why.length < 5) why.push(w); }
      if (id.indexOf(w) !== -1) { score += 2; if (why.length < 5) why.push(w); }
      if (cat.indexOf(w) !== -1) { score += 1; }
    }
    return { s: s, score: score, why: why };
  }).filter(x => x.score >= 3).sort((a, b) => b.score - a.score).slice(0, lim);
  if (!scored.length) return 'No strong skill match for: ' + task + '. Try skill_search instead.';
  return scored.map(x => '- ' + x.s.id + ' [' + (x.s.agent || '') + '/' + (x.s.category || '') + '] score=' + x.score + ' matched: ' + x.why.join(', ')).join('\n');
}

const SKILL_IDS = require('./skills-list.json');

const SKILL_TOOLS = SKILL_IDS.map(sid => {
  const s = catalog().byId[sid] || {};
  const d = String(s.description || '').split(/\s+/).join(' ');
  const short = d.length > 190 ? d.slice(0, 190).replace(/\s+\S*$/, '') + '...' : d;
  return {
    name: 'skill_' + sid.replace(/[^a-z0-9_-]/gi, '_'),
    description: 'SHADDAI SKILL [' + (s.agent || 'SHADDAI') + '/' + (s.category || 'Skills') + ']: ' + short + ' Call for the full methodology and step-by-step playbook.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: () => skillBody(sid),
  };
});

const SKILL_META = [
  {
    name: 'skill_search',
    description: 'Search all 3022 SHADDAI skills by keyword. Returns matching skill ids + agent + category. Use when no skill_<id> tool obviously fits.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
    run: (a) => skillSearch(a.query, a.limit),
  },
  {
    name: 'skill_get',
    description: 'Get the full methodology for ANY of the 3022 skills by id (not just the 270 curated ones).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    run: (a) => skillBody(String(a.id || '')),
  },
  {
    name: 'skill_list_by_agent',
    description: 'List skill ids by agent (SHADDAI, NEXUS, ZEROX, ORACLE, TURTLE, QUILL, PIKADON).',
    inputSchema: { type: 'object', properties: { agent: { type: 'string' } }, required: [] },
    run: (a) => {
      const ag = String(a.agent || '').toUpperCase();
      const all = catalog().all.filter(s => (s.agent || '') === ag).map(s => s.id);
      return all.length ? all.join('\n') : 'No skills for ' + ag;
    },
  },
  {
    name: 'skill_list_by_category',
    description: 'List skill ids by category (gamedebug, Marketing Skills, ops, writing, security, art).',
    inputSchema: { type: 'object', properties: { category: { type: 'string' } }, required: [] },
    run: (a) => {
      const c = String(a.category || '');
      const all = catalog().all.filter(s => (s.category || '') === c).map(s => s.id);
      return all.length ? all.join('\n') : 'No skills in category ' + c;
    },
  },
  {
    name: 'skill_count',
    description: 'Count of skills in the catalog and how many are exposed as curated tools.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    run: () => JSON.stringify({ totalSkills: catalog().all.length, curatedTools: SKILL_IDS.length, allAccessible: true }),
  },
  {
    name: 'skill_recommend',
    description: 'Recommend the best skills for a TASK using concept expansion. e.g. "we are making a commercial" -> cinematography/UGC/video skills; "pricing my SaaS" -> pricing/revenue skills. Returns ranked skill ids with the matched concepts.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, limit: { type: 'number' } }, required: ['task'] },
    run: (a) => skillRecommend(a.task, a.limit),
  },
];

const ALL_SKILL_TOOLS = SKILL_META.concat(SKILL_TOOLS);
module.exports = { ALL_SKILL_TOOLS: ALL_SKILL_TOOLS, SKILL_IDS: SKILL_IDS, skillBody: skillBody, skillSearch: skillSearch };
