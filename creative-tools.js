'use strict';
// Creative tools ported from Shaddai-Frames/skills-shaddai/agent-mcp/server.mjs
// so the main shaddai MCP carries ONE combined tool surface.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRAMES_REPO = 'C:\\Users\\Brittany\\Shaddai-Frames';
const STYLES_DIR = path.join(FRAMES_REPO, 'skills-shaddai', '..', 'vendor', 'lemo-opuscar', 'styles');
// vendor may live under the frames repo root
const STYLES_DIR2 = path.join(FRAMES_REPO, 'vendor', 'lemo-opuscar', 'styles');
const STYLES_DIR_FINAL = fs.existsSync(STYLES_DIR2) ? STYLES_DIR2 : STYLES_DIR;
const FORGE = path.join(FRAMES_REPO, 'skills-shaddai', 'binary-forge', 'binary-forge.mjs');
const RECIPES = path.join(FRAMES_REPO, 'skills-shaddai', 'film-styles');
const TURTLE_STORE = 'C:\\Users\\Brittany\\Shaddai-Beta\\backend\\knowledge\\mastery\\TURTLE';
const UI_BRIEF = path.join(FRAMES_REPO, 'agents', 'UI-ENGINEERING-BRIEF.md');
const UI_GUIDE = path.join(FRAMES_REPO, 'agents', 'OPUS-5.5-UI-ENGINEERING.md');
const HANDOFF = path.join(FRAMES_REPO, 'HANDOFF.md');
const PLAYBOOK = path.join(FRAMES_REPO, 'agents', 'PLAYBOOK.md');
const PORTFOLIO = path.join(FRAMES_REPO, 'videos', 'portfolio', 'PORTFOLIO.md');

const PHI = 1.6180339887;
const AGENTS = [
  { name: 'SHADDAI', port: 8000, role: 'Supreme Orchestrator', domains: ['strategy', 'routing', 'final-QA'] },
  { name: 'ZEROX', port: 8001, role: 'Wealth & Revenue', domains: ['pricing', 'billing', 'markets'] },
  { name: 'ORACLE', port: 8002, role: 'Research & Intelligence', domains: ['research', 'trends', 'synthesis'] },
  { name: 'NEXUS', port: 8003, role: 'Technical Architect', domains: ['backend', 'APIs', 'engine'] },
  { name: 'TURTLE', port: 8004, role: 'Creation Master', domains: ['color', 'sacred geometry', 'music', 'brand', 'image prompts'] },
  { name: 'QUILL', port: 8005, role: 'Writer & Scribe', domains: ['docs', 'copy', 'guides'] },
  { name: 'PIKADON', port: 8008, role: 'Security & Compliance', domains: ['audits', 'RBAC', 'secrets'] },
];

function fibonacci(n) {
  const k = Math.min(Math.max(parseInt(n) || 13, 3), 40);
  const seq = [0, 1];
  for (let i = 2; i <= k; i++) seq.push(seq[i - 1] + seq[i - 2]);
  const ratios = [];
  for (let i = 2; i < seq.length; i++) ratios.push(Number((seq[i] / seq[i - 1]).toFixed(6)));
  return JSON.stringify({ sequence: seq, ratios_approaching_phi: ratios, golden_ratio_phi: PHI,
    design_applications: { typography_scale: seq.slice(3, 9), spacing_system: seq.slice(2, 9), layout_columns: [2, 3, 5, 8], spiral_guide: seq.slice(0, 9) } });
}
function goldenRatio(width, height) {
  const w = Number(width) || 1080, h = Number(height) || 1920;
  const actual = Number((w / h).toFixed(6));
  const table = [['golden_ratio_phi', 1.618], ['16_9', 1.7778], ['3_2', 1.5], ['4_3', 1.3333], ['silver_ratio', 1.4142], ['bronze_ratio', 1.7321], ['1_1', 1.0]];
  let best = table[0], bestDiff = Infinity;
  const long = Math.max(w, h), short = Math.min(w, h), ratioLong = long / short;
  for (const row of table) { const d = Math.abs(row[1] - ratioLong); if (d < bestDiff) { bestDiff = d; best = row; } }
  return JSON.stringify({ dimensions: { width: w, height: h }, actual_ratio: actual, golden_ratio: 1.618034,
    is_golden: Math.abs(ratioLong - PHI) < 0.01, closest_sacred_ratio: best[0], closest_value: best[1],
    fibonacci_golden_dimensions: { keep_width: short, golden_height: Number((short * PHI).toFixed(2)), keep_height: long, golden_width: Number((long * PHI).toFixed(2)) },
    rating: bestDiff < 0.03 ? 'Near-golden' : 'Standard' });
}
const MOODS = { sacred: { dominant: '#07070f', support: '#8b5cf6', accent: '#f5c542', extra: ['#f4f4f5', '#2f6f57'] },
  noir: { dominant: '#0a0a10', support: '#14141f', accent: '#e24fd0', extra: ['#26e0e8', '#f4f4f5'] },
  cosmic: { dominant: '#070716', support: '#1e1b4b', accent: '#f5c542', extra: ['#8b5cf6', '#3fe8ff'] },
  serene: { dominant: '#f4f1e8', support: '#cdd8cc', accent: '#7a9e7e', extra: ['#3a5a5c', '#e8dcc8'] },
  luxury: { dominant: '#12100e', support: '#241f1a', accent: '#d4a017', extra: ['#f4ecd8', '#6b5a3c'] },
  playful: { dominant: '#fff4e6', support: '#ffd166', accent: '#ef476f', extra: ['#06d6a0', '#118ab2'] },
  cyber: { dominant: '#0b0a1a', support: '#12122e', accent: '#ff3fd8', extra: ['#00e5ff', '#f5c542'] },
  natural: { dominant: '#f2ead8', support: '#c8b48c', accent: '#5a7d4f', extra: ['#8a6216', '#3a5a5c'] },
  bold: { dominant: '#111114', support: '#e63946', accent: '#f5c542', extra: ['#f4f4f5', '#264653'] },
  minimal: { dominant: '#f7f7f5', support: '#d8d8d4', accent: '#16161d', extra: ['#8a8a86', '#c1272d'] } };
function palette(mood, count) {
  const m = (mood || 'sacred').toLowerCase();
  const set = MOODS[m] || MOODS.sacred;
  const c = Math.min(Math.max(parseInt(count) || 5, 3), 6);
  const full = [set.dominant, set.support, set.accent, ...set.extra];
  return JSON.stringify({ mood: MOODS[m] ? m : 'sacred (fallback)', palette: full.slice(0, c), roles: ['dominant', 'support', 'accent'] });
}
const GEOMETRY = {
  metatron: { name: "Metatron's Cube", nodes: 13, lines: 78, construction: ['1 center node', '6 nodes at radius r', '6 nodes at radius r*sqrt(3)', 'connect every pair'], draw_hint: 'gold on indigo reads well' },
  'flower-of-life': { name: 'Flower of Life', core_circles: 7, completed_circles: 19, draw_hint: 'stroke-only, alpha .1-.15' },
  'sri-yantra': { name: 'Sri Yantra', triangles: 9, draw_hint: 'neon cyan for Shakti, magenta for Shiva' },
  'vesica-piscis': { name: 'Vesica Piscis', construction: ['two circles radius r separated by r'], draw_hint: 'seed of flower-of-life' },
  'fibonacci-spiral': { name: 'Fibonacci Spiral', golden_angle_deg: 137.507764, square_subdivision: [5, 8, 13, 21, 34, 55, 89, 144], draw_hint: 'portrait 1080x1920: golden rect 662x1071' },
  torus: { name: 'Torus', draw_hint: 'squash vertical by ~0.34' },
  tesseract: { name: 'Tesseract (4D Hypercube)', vertices: 16, edges: 32, draw_hint: 'double-rotate slowly' },
};
function geometry(form) {
  const f = (form || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (GEOMETRY[f]) return JSON.stringify(GEOMETRY[f]);
  return JSON.stringify({ available_forms: Object.keys(GEOMETRY) });
}
function readFileBounded(p, cap) {
  if (!fs.existsSync(p)) return 'NOT FOUND: ' + p;
  const txt = fs.readFileSync(p, 'utf8');
  return txt.length > cap ? txt.slice(0, cap) + '\n...[truncated]' : txt;
}
function stylesList() {
  if (!fs.existsSync(STYLES_DIR_FINAL)) return JSON.stringify({ count: 0, error: 'styles dir not found: ' + STYLES_DIR_FINAL });
  const slugs = fs.readdirSync(STYLES_DIR_FINAL).filter((d) => {
    const full = path.join(STYLES_DIR_FINAL, d);
    return fs.statSync(full).isDirectory() && d !== '_template' && fs.existsSync(path.join(full, 'STYLE.md'));
  });
  return JSON.stringify({ count: slugs.length, styles: slugs, source: 'vendor/lemo-opuscar (MIT)' });
}
function stylesGet(slug) {
  const s = String(slug || '').replace(/[^a-z0-9-]/gi, '');
  const dir = path.join(STYLES_DIR_FINAL, s);
  if (!fs.existsSync(dir)) return 'Unknown style. Use styles_list for slugs.';
  const meta = fs.existsSync(path.join(dir, 'style.json')) ? fs.readFileSync(path.join(dir, 'style.json'), 'utf8').slice(0, 2000) : '';
  return '=== style.json ===\n' + meta + '\n=== STYLE.md ===\n' + readFileBounded(path.join(dir, 'STYLE.md'), 12000);
}
function recipeGet(style) {
  const s = String(style || '').toLowerCase();
  const p = path.join(RECIPES, 'RECIPE-' + s + '.md');
  if (!fs.existsSync(p)) {
    const have = fs.existsSync(RECIPES) ? fs.readdirSync(RECIPES).filter((f) => f.startsWith('RECIPE-')) : [];
    return 'No recipe yet for: ' + s + '. Existing: ' + have.join(', ');
  }
  return readFileBounded(p, 12000);
}
function uiStack() {
  const pages = fs.existsSync(TURTLE_STORE) ? fs.readdirSync(TURTLE_STORE).filter((f) => f.startsWith('rag-ui-engineering-')).sort() : [];
  return JSON.stringify({ brief: 'agents/UI-ENGINEERING-BRIEF.md', loop: 'brief → references → tokens → components → every state → screenshot-and-fix → ship', turtle_brain_pages: pages, tools_hint: 'ui_resource with a number/key returns one of the above 1:1' });
}
function uiResource(key) {
  const k = String(key || '').toLowerCase().trim();
  const num = (k.match(/^\d+/) || [null])[0];
  const paths = { '02': 'rag-ui-engineering-02-frontend-design.md', '09': 'rag-ui-engineering-09-mobbin.md', '11': 'rag-ui-engineering-11-google-fonts.md', '12': 'rag-ui-engineering-12-fontshare.md', '13': 'rag-ui-engineering-13-realtimecolors.md', '14': 'rag-ui-engineering-14-webaim.md', '18': 'rag-ui-engineering-18-unsplash.md', '19': 'rag-ui-engineering-19-squoosh.md', '20': 'rag-ui-engineering-20-vercel.md' };
  if (k === 'internal' || ['01','03','04','05','06','07','08','10','15','16','17'].includes(num)) {
    return JSON.stringify({ note: 'captured in the LIVE RAG brain — query with rag_search/rag_ask', number: num });
  }
  if (num && paths[num]) { const p = path.join(TURTLE_STORE, paths[num]); if (fs.existsSync(p)) return readFileBounded(p, 12000); }
  if (num === '02' || k.includes('skill')) { const p = 'C:\\Users\\Brittany\\.agents\\skills\\frontend-design\\SKILL.md'; if (fs.existsSync(p)) return readFileBounded(p, 12000); }
  if (k === 'brief') return readFileBounded(UI_BRIEF, 14000);
  if (k === 'guide') return readFileBounded(UI_GUIDE, 14000);
  return JSON.stringify({ note: 'pass 01..20, or brief, or guide', brief: UI_BRIEF });
}
function forgeRun(args) {
  const mode = String(args.mode || 'img2art');
  if (!['img2art', 'bin2img', 'img2bin'].includes(mode)) return 'ERROR: mode must be img2art | bin2img | img2bin';
  const input = String(args.input || '');
  if (!fs.existsSync(path.resolve(input))) return 'ERROR: input not found: ' + input;
  const out = args.out ? String(args.out) : undefined;
  const cliArgs = [FORGE, mode, input];
  if (out) cliArgs.push(out);
  if (mode === 'img2art') { if (args.cols) cliArgs.push('--cols', String(parseInt(args.cols))); if (args.cell) cliArgs.push('--cell', String(parseInt(args.cell))); if (args.invert) cliArgs.push('--invert'); }
  if (mode === 'bin2img' && args.binMode) cliArgs.push('--mode', args.binMode === 'gray' ? 'gray' : 'rgb');
  const res = spawnSync('node', cliArgs, { encoding: 'utf8', timeout: 300000, cwd: FRAMES_REPO });
  const outPath = out || (String(res.stdout || '').match(/([A-Za-z]:\\[^\r\n]+\.png)/) || [null, null])[1];
  return JSON.stringify({ mode, exitCode: res.status, ok: res.status === 0, outPath, outExists: outPath ? fs.existsSync(outPath) : false, stdout: String(res.stdout || '').split(/\r?\n/).slice(-8).join('\n'), stderr: String(res.stderr || '').split(/\r?\n/).slice(-4).join('\n') });
}

const CREATIVE_TOOLS = [
  { name: 'shaddai_agents', description: 'The 7-agent SHADDAI council: ports, roles, domains, and live known-issues.', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => JSON.stringify({ agents: AGENTS, mcp_note: 'Deterministic creative skills live in the main MCP now.' }) },
  { name: 'turtle_fibonacci', description: "TURTLE's Fibonacci sequence, ratios converging to phi, and design applications.", inputSchema: { type: 'object', properties: { n: { type: 'number', description: 'How many terms (3-40, default 13)' } }, required: [] }, run: (a) => fibonacci(a.n) },
  { name: 'turtle_golden_ratio', description: 'Check width/height against the golden ratio.', inputSchema: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' } }, required: ['width', 'height'] }, run: (a) => goldenRatio(a.width, a.height) },
  { name: 'turtle_palette', description: 'Deterministic mood-to-palette map. Moods: sacred, noir, cosmic, serene, luxury, playful, cyber, natural, bold, minimal.', inputSchema: { type: 'object', properties: { mood: { type: 'string', description: 'One of the 10 moods' }, count: { type: 'number', description: '3-6 colors (default 5)' } }, required: ['mood'] }, run: (a) => palette(a.mood, a.count) },
  { name: 'turtle_geometry', description: 'TURTLE sacred-geometry data sheets: metatron, flower-of-life, sri-yantra, vesica-piscis, fibonacci-spiral, torus, tesseract.', inputSchema: { type: 'object', properties: { form: { type: 'string', description: 'Which form; omit to list all' } }, required: [] }, run: (a) => geometry(a.form) },
  { name: 'styles_list', description: 'List the 43 code-native film styles vendored from lemo-opuscar (MIT).', inputSchema: { type: 'object', properties: {}, required: [] }, run: stylesList },
  { name: 'styles_get', description: "Read one film style's full STYLE.md grammar plus style.json.", inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Style slug from styles_list' } }, required: ['slug'] }, run: (a) => stylesGet(a.slug) },
  { name: 'styles_director', description: 'The lemo-opuscar DIRECTOR.md — full directing method for style films.', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => readFileBounded(path.join(FRAMES_REPO, 'vendor', 'lemo-opuscar', 'DIRECTOR.md'), 10000) },
  { name: 'styles_technique', description: 'The lemo-opuscar TECHNIQUE.md — build patterns for style films.', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => readFileBounded(path.join(FRAMES_REPO, 'vendor', 'lemo-opuscar', 'TECHNIQUE.md'), 10000) },
  { name: 'recipe_get', description: 'Get a proven SHADDAI film recipe (RECIPE-<style>.md).', inputSchema: { type: 'object', properties: { style: { type: 'string' } }, required: ['style'] }, run: (a) => recipeGet(a.style) },
  { name: 'forge_run', description: 'Run binary-forge: img2art, bin2img, img2bin.', inputSchema: { type: 'object', properties: { mode: { type: 'string', description: 'img2art | bin2img | img2bin' }, input: { type: 'string', description: 'Input file path' }, out: { type: 'string', description: 'Output path' }, cols: { type: 'number' }, cell: { type: 'number' }, invert: { type: 'boolean' }, binMode: { type: 'string' } }, required: ['mode', 'input'] }, run: forgeRun },
  { name: 'ui_stack', description: 'SHADDAI UI-Engineering stack: the saved 20-resource brief + build loop.', inputSchema: { type: 'object', properties: {}, required: [] }, run: uiStack },
  { name: 'ui_resource', description: "Read one UI-engineering resource 1:1: a number 01-20, 'skill', 'brief', or 'guide'.", inputSchema: { type: 'object', properties: { key: { type: 'string', description: '01-20 | skill | brief | guide' } }, required: ['key'] }, run: (a) => uiResource(a.key) },
  { name: 'handoff_read', description: 'Read HANDOFF.md — session state, queue, master prompt.', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => readFileBounded(HANDOFF, 12000) },
  { name: 'playbook_read', description: 'Read agents/PLAYBOOK.md — production lessons.', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => readFileBounded(PLAYBOOK, 14000) },
  { name: 'portfolio_read', description: 'Read the portfolio manifest (PORTFOLIO.md).', inputSchema: { type: 'object', properties: {}, required: [] }, run: () => readFileBounded(PORTFOLIO, 12000) },
];

module.exports = { CREATIVE_TOOLS };
