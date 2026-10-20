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

// -- Design studio + game dev triggers (so ONE MCP reaches everything) --------
const DESIGN_STUDIO = "C:\\Users\\Brittany\\shaddai-design-studio";
function designStudioPortfolio() {
  const p = path.join(DESIGN_STUDIO, "portfolio", "portfolio.json");
  if (!fs.existsSync(p)) return "NOT FOUND: " + p;
  return readFileBounded(p, 8000);
}
function designStudioTools() {
  const d = path.join(DESIGN_STUDIO, "tools");
  if (!fs.existsSync(d)) return "NOT FOUND: " + d;
  return JSON.stringify(fs.readdirSync(d));
}
function gameDevInfo() {
  return JSON.stringify({
    repo: "https://github.com/IzzoSol/shaddai-gamedev-tools",
    description: "MIT-licensed Three.js game-dev suite: flat-library reference, AI SKILLS-HUB scaffolding, six GENRE-TEMPLATES, MCP bridge for agents to build whole games.",
    mcp_bridge: "shaddai-gamedev-tools includes an MCP bridge � install separately and point your agent at it.",
    local: false,
    note: "Not cloned locally. Install via: git clone https://github.com/IzzoSol/shaddai-gamedev-tools.git"
  });
}
const EXTRA_TRIGGERS = [
  { name: "design_studio_portfolio", description: "Read the SHADDAI design studio portfolio index (all diagrams, UGC pieces, gallery).", inputSchema: { type: "object", properties: {}, required: [] }, run: designStudioPortfolio },
  { name: "design_studio_tools", description: "List the tools in the SHADDAI design studio (diagrams, portfolio, gallery, serve).", inputSchema: { type: "object", properties: {}, required: [] }, run: designStudioTools },
  { name: "gamedev_info", description: "Info + install link for the SHADDAI game-dev tools repo (Three.js suite, MCP bridge, genre templates).", inputSchema: { type: "object", properties: {}, required: [] }, run: gameDevInfo },
];
for (const t of EXTRA_TRIGGERS) {
  if (!CREATIVE_TOOLS.some(x => x.name === t.name)) CREATIVE_TOOLS.push(t);
}

// -- NVIDIA-inspired SHADDAI-native skills (adapted concepts, no GPU needed) --
function ragEval(query, k) {
  // Lightweight RAG evaluation: returns the query + suggested k for retrieval scoring.
  // Adapted from NVIDIA rag-eval/rag-perf concepts (precision@k, MRR) but run over our TF-IDF brain.
  const kk = Math.min(Math.max(parseInt(k) || 5, 1), 20);
  return JSON.stringify({
    query: query || "",
    k: kk,
    metrics: ["precision@k", "recall@k", "MRR", "nDCG"],
    how_to_score: "Run rag_search with topK=" + kk + ", then mark each result relevant (1/0). precision@k = (#relevant in top-k)/k. MRR = 1/rank of first relevant. nDCG = DCG/IDCG.",
    tip: "Use rag_search for the big brain, rag_council for cross-agent, then score manually or with a judge LLM."
  });
}
function portfolioOptimize(returns, targetReturn) {
  // Mean-variance-ish weight suggestion (equal-weight baseline + variance cap concept).
  // Adapted from NVIDIA portfolio-optimization (cuOpt) but pure JS, no GPU.
  const r = Array.isArray(returns) ? returns : [];
  const n = r.length || 1;
  // equal weight baseline
  const w = r.map(() => Number((1 / n).toFixed(4)));
  const mean = r.reduce((a, b) => a + b, 0) / n;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return JSON.stringify({
    tickers: n,
    equal_weight: w,
    mean_return: Number(mean.toFixed(6)),
    variance: Number(variance.toFixed(6)),
    target_return: targetReturn || null,
    note: "For real cuOpt-grade optimization use NVIDIA cuOpt. This is a baseline; SHADDAI paper trading (zerox_paper_*) uses Kelly sizing on top."
  });
}
function videoPipelinePlan(url, stages) {
  const s = Array.isArray(stages) ? stages : ["download", "transcribe", "clip", "caption", "publish"];
  return JSON.stringify({
    input: url || "",
    stages: s,
    tools: {
      download: "shaddai_media_fetch / shaddai_capture (mode=media)",
      transcribe: "backend turtle-video-service.py (Whisper)",
      clip: "shaddai_capture (mode=clip) / ffmpeg",
      caption: "shaddai_capture + LLM",
      publish: "bridge_call / hall_post"
    },
    tip: "Run stages in order; each stage feeds the next. Use workflow_run to orchestrate."
  });
}
const NVIDIA_INSPIRED = [
  { name: "rag_eval", description: "RAG evaluation helper: suggests metrics (precision@k, recall, MRR, nDCG) and scoring steps for a query. Adapted from NVIDIA rag-eval/rag-perf concepts.", inputSchema: { type: "object", properties: { query: { type: "string" }, k: { type: "number" } }, required: ["query"] }, run: (a) => ragEval(a.query, a.k) },
  { name: "portfolio_optimize", description: "Mean-variance baseline weight suggestion (equal-weight + variance). Adapted from NVIDIA portfolio-optimization (cuOpt) but pure JS, no GPU.", inputSchema: { type: "object", properties: { returns: { type: "array", items: { type: "number" } }, target_return: { type: "number" } }, required: ["returns"] }, run: (a) => portfolioOptimize(a.returns, a.target_return) },
  { name: "video_pipeline_plan", description: "Plan a multi-stage video pipeline (download -> transcribe -> clip -> caption -> publish). Adapted from NVIDIA deepstream/vss concepts.", inputSchema: { type: "object", properties: { url: { type: "string" }, stages: { type: "array", items: { type: "string" } } }, required: [] }, run: (a) => videoPipelinePlan(a.url, a.stages) },
];
for (const t of NVIDIA_INSPIRED) {
  if (!CREATIVE_TOOLS.some(x => x.name === t.name)) CREATIVE_TOOLS.push(t);
}

// -- Game design + motion graphics + UGC + security tools ---------------------
function designStudioCatalog() {
  const p = path.join(DESIGN_STUDIO, "tools", "catalog.json");
  if (!fs.existsSync(p)) return "NOT FOUND: " + p;
  return readFileBounded(p, 8000);
}
function designStudioGallery() {
  const p = path.join(DESIGN_STUDIO, "portfolio", "portfolio.json");
  if (!fs.existsSync(p)) return "NOT FOUND: " + p;
  return readFileBounded(p, 8000);
}
function designStudioLint() {
  return JSON.stringify({
    tool: "dash-visual-lint.mjs",
    path: path.join(DESIGN_STUDIO, "tools", "dash-visual-lint.mjs"),
    usage: "node tools/dash-visual-lint.mjs <html-file> � audits a view for visual issues",
    note: "Run via shell; returns lint report. Use for UGC ad / game pitch / trailer QA."
  });
}
function motionGraphicsPlan(style, duration) {
  return JSON.stringify({
    style: style || "hyperframes",
    duration: duration || "30s",
    pipeline: ["brief", "storyboard", "design tokens", "components", "animation (GSAP)", "render (hyperframes)", "QA", "publish"],
    tools: { brief: "agents/UI-ENGINEERING-BRIEF.md", render: "hyperframes CLI", qa: "dash-visual-lint.mjs" },
    tip: "Use hyperframes skill for the full pipeline. This MCP exposes the plan + design studio tools."
  });
}
function gamedevSuite() {
  return JSON.stringify({
    repo: "https://github.com/IzzoSol/shaddai-gamedev-tools",
    description: "MIT-licensed Three.js game-dev suite: flat-library reference, AI SKILLS-HUB scaffolding, six GENRE-TEMPLATES, MCP bridge.",
    local: false,
    install: "git clone https://github.com/IzzoSol/shaddai-gamedev-tools.git",
    mcp_bridge: "Includes an MCP bridge � install separately and point your agent at it for game building.",
    use_cases: ["build a 3D game from a prompt", "scaffold a genre template", "query the Three.js flat library", "AI agent game building"]
  });
}
function securityScrapePlan(url) {
  return JSON.stringify({
    url: url || "",
    steps: ["pikadon: validate URL (SSRF guard)", "web_scrape: fetch + strip", "detect_secrets: scan for leaked keys", "redact_pii: scrub PII", "rag ingest: store in brain"],
    tools: ["web_scrape", "detect_secrets", "redact_pii", "hall_web_scrape"],
    note: "PIKADON reviews every scrape for SSRF and secret leakage before ingestion."
  });
}
const EXTRA_TOOLS_2 = [
  { name: "design_studio_catalog", description: "Read the SHADDAI design studio catalog (all views, visual lint rules, build pipeline).", inputSchema: { type: "object", properties: {}, required: [] }, run: designStudioCatalog },
  { name: "design_studio_gallery", description: "Read the design studio portfolio index (diagrams, UGC pieces, gallery).", inputSchema: { type: "object", properties: {}, required: [] }, run: designStudioGallery },
  { name: "design_studio_lint", description: "Info for running the design studio visual linter (dash-visual-lint.mjs) on an HTML file.", inputSchema: { type: "object", properties: {}, required: [] }, run: designStudioLint },
  { name: "motion_graphics_plan", description: "Plan a motion graphics / HyperFrames pipeline (brief -> storyboard -> tokens -> components -> animation -> render -> QA -> publish).", inputSchema: { type: "object", properties: { style: { type: "string" }, duration: { type: "string" } }, required: [] }, run: (a) => motionGraphicsPlan(a.style, a.duration) },
  { name: "gamedev_suite", description: "Info + install link for the SHADDAI game-dev tools repo (Three.js suite, MCP bridge, genre templates).", inputSchema: { type: "object", properties: {}, required: [] }, run: gamedevSuite },
  { name: "security_scrape_plan", description: "Plan a PIKADON-reviewed web scrape (SSRF guard + secret scan + PII redact + ingest).", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: [] }, run: (a) => securityScrapePlan(a.url) },
];
for (const t of EXTRA_TOOLS_2) {
  if (!CREATIVE_TOOLS.some(x => x.name === t.name)) CREATIVE_TOOLS.push(t);
}

// -- Expanded creative / design / content / marketing tools (deterministic) --
function headlineGen(topic) {
  const t = (topic || "your product").trim();
  return JSON.stringify({
    headlines: [
      "How to " + t + " in 30 days",
      "The ultimate guide to " + t,
      t + ": what nobody tells you",
      "5 " + t + " mistakes to avoid",
      "Why " + t + " matters more than you think",
      "The " + t + " playbook for 2026"
    ]
  });
}
function ctaGen(goal) {
  const g = (goal || "sign up").toLowerCase();
  const ctas = {
    "sign up": ["Start free", "Create account", "Join now", "Get started"],
    "buy": ["Buy now", "Add to cart", "Get yours", "Shop now"],
    "download": ["Download free", "Get the app", "Install now", "Grab it"],
    "subscribe": ["Subscribe", "Join the list", "Stay updated", "Get updates"]
  };
  return JSON.stringify({ goal: g, ctas: ctas[g] || ["Learn more", "Get started", "Try free", "Contact us"] });
}
function seoTitle(topic, keyword) {
  const t = topic || "Guide"; const k = keyword || t;
  return JSON.stringify({
    titles: [
      k + ": Complete " + t + " Guide (2026)",
      "Best " + t + " for " + k + " � " + new Date().getFullYear(),
      t + " � " + k + " Tips & Strategies",
      "How to " + t + " for " + k
    ]
  });
}
function emailSubject(topic) {
  const t = topic || "update";
  return JSON.stringify({
    subjects: [
      "Quick question about " + t,
      t + " � your next step",
      "New: " + t,
      "Don't miss: " + t,
      t + " (action required)",
      "Re: " + t
    ]
  });
}
function socialPost(topic, platform) {
  const t = topic || "update"; const p = (platform || "twitter").toLowerCase();
  const base = t + " � ";
  const posts = {
    twitter: base + "Here's what you need to know. ????",
    linkedin: base + "I've been thinking about this a lot lately. Here's my take.",
    instagram: base + "? New post! Link in bio.",
    tiktok: base + "POV: you finally understand " + t + " ??"
  };
  return JSON.stringify({ platform: p, post: posts[p] || base + "Check it out!", hashtags: ["#" + t.replace(/\s+/g, ""), "#shaddai", "#ai"] });
}
function colorHarmony(hex) {
  const h = (hex || "#8b5cf6").replace("#", "");
  return JSON.stringify({ base: "#" + h, harmony: "triadic", note: "Use analogous_colors / triadic_colors / complementary_color for exact values." });
}
function typographyScale(base, ratio) {
  const b = Number(base) || 16; const r = Number(ratio) || 1.25;
  const scale = [];
  for (let i = 0; i < 8; i++) scale.push(Math.round(b * Math.pow(r, i)));
  return JSON.stringify({ base: b, ratio: r, scale_px: scale, scale_rem: scale.map(x => (x / 16).toFixed(3)) });
}
function layoutGrid(cols, gutter) {
  const c = Math.min(Math.max(parseInt(cols) || 12, 1), 16);
  const g = parseInt(gutter) || 16;
  return JSON.stringify({ columns: c, gutter_px: g, column_width_pct: (100 / c).toFixed(2) + "%", total_gutter: g * (c - 1) });
}
function spacingSystem(base) {
  const b = Number(base) || 8;
  return JSON.stringify({ base: b, scale: [b * 0.5, b, b * 1.5, b * 2, b * 3, b * 4, b * 6, b * 8].map(x => Math.round(x)) });
}
function brandVoice(tone) {
  const tones = {
    professional: { adjectives: ["clear", "authoritative", "precise"], avoid: ["slang", "exclamation overload"], example: "We deliver results." },
    playful: { adjectives: ["fun", "energetic", "casual"], avoid: ["jargon", "stiffness"], example: "Let's make something awesome!" },
    luxury: { adjectives: ["elegant", "refined", "exclusive"], avoid: ["discount language", "urgency"], example: "Crafted for those who appreciate excellence." },
    technical: { adjectives: ["precise", "detailed", "accurate"], avoid: ["vagueness", "marketing fluff"], example: "Implements O(n log n) sorting with zero allocations." }
  };
  const t = (tone || "professional").toLowerCase();
  return JSON.stringify({ tone: tones[t] ? t : "professional", ...(tones[t] || tones.professional) });
}
function landingPagePlan(product) {
  const p = product || "product";
  return JSON.stringify({
    product: p,
    sections: ["hero (headline + CTA)", "social proof (logos/testimonials)", "features (3-5)", "how it works", "pricing", "FAQ", "final CTA", "footer"],
    tips: ["Above the fold CTA", "One primary action per section", "Mobile-first", "Fast load (<2s)"]
  });
}
function emailTemplate(type) {
  const types = {
    welcome: { subject: "Welcome to {{product}}!", body: "Hi {{name}},\n\nWelcome! Here's how to get started:\n1. ...\n2. ...\n3. ...\n\nBest,\n{{team}}" },
    newsletter: { subject: "{{product}} Weekly � {{date}}", body: "Hi {{name}},\n\nThis week:\n- {{item1}}\n- {{item2}}\n\nRead more ? {{link}}" },
    promo: { subject: "{{discount}}% off {{product}}", body: "Hi {{name}},\n\nFor a limited time, get {{discount}}% off.\n\nUse code: {{code}}\n\nShop now ? {{link}}" }
  };
  const t = (type || "welcome").toLowerCase();
  return JSON.stringify({ type: t, ...(types[t] || types.welcome) });
}
function seoMeta(topic, keyword) {
  const t = topic || "Guide"; const k = keyword || t;
  return JSON.stringify({
    title: k + " � " + t + " (" + new Date().getFullYear() + ")",
    description: "Learn everything about " + t + " for " + k + ". Tips, strategies, and best practices.",
    keywords: [k, t, t + " guide", "how to " + t, t + " " + new Date().getFullYear()],
    og_title: k + " � " + t
  });
}
function colorPaletteFromSeed(seed) {
  const s = (seed || "shaddai").toLowerCase();
  // deterministic pseudo-palette from string hash
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const colors = [];
  for (let i = 0; i < 5; i++) { const hue = (h + i * 72) % 360; colors.push("hsl(" + hue + ", 70%, 50%)"); }
  return JSON.stringify({ seed: s, palette: colors, note: "Use turtle_palette for mood-based palettes." });
}
function qrCodePlan(data) {
  return JSON.stringify({ data: data || "", format: "PNG", size: "256x256", tip: "Use a QR library (qrcode npm) to generate; this MCP plans the payload." });
}
function jsonSchemaGen(sample) {
  return JSON.stringify({ note: "Provide a sample JSON object; this tool describes the inferred schema.", sample: sample || {}, tip: "Use json_format to pretty-print, json_keys to list top-level keys." });
}
function regexHelper(pattern) {
  const p = pattern || "\\d+";
  return JSON.stringify({ pattern: p, test_strings: ["abc123", "no-numbers", "42"], tip: "Use regex_extract / regex_replace / escape_regex tools." });
}
function apiEndpointPlan(resource) {
  const r = resource || "users";
  return JSON.stringify({
    resource: r,
    endpoints: [
      "GET /api/" + r,
      "GET /api/" + r + "/:id",
      "POST /api/" + r,
      "PUT /api/" + r + "/:id",
      "DELETE /api/" + r + "/:id"
    ],
    tip: "RESTful CRUD. Use curl_build to generate curl commands."
  });
}
function dbSchemaPlan(entities) {
  const e = Array.isArray(entities) ? entities : ["users", "orders"];
  return JSON.stringify({ entities: e, tip: "Each entity becomes a table with id, created_at, updated_at. Add relations as foreign keys." });
}
function testPlan(feature) {
  const f = feature || "feature";
  return JSON.stringify({
    feature: f,
    tests: ["unit: core logic", "integration: API endpoints", "e2e: user flow", "edge: empty/null/large inputs", "security: auth + injection"],
    tip: "Use test:jest in backend. Run gate-node.js for node-level checks."
  });
}
function deployPlan(env) {
  const e = env || "production";
  return JSON.stringify({
    env: e,
    steps: ["build", "test", "lint", "security audit", "deploy", "health check", "smoke test"],
    tip: "Render deploy config is in Shaddai-Beta. Use PRODUCTION-DEPLOYMENT.md for details."
  });
}
function onboardingPlan(product) {
  const p = product || "product";
  return JSON.stringify({
    product: p,
    steps: ["sign up", "verify email", "first action (aha moment)", "invite team", "upgrade"],
    tip: "Track activation rate. Use analytics-tracking skill for implementation."
  });
}
function pricingPlan(model) {
  const m = model || "freemium";
  return JSON.stringify({
    model: m,
    tiers: ["free (limited)", "starter ($X/mo)", "pro ($Y/mo)", "enterprise (custom)"],
    tip: "Use zerox_commission_rate + zerox_record_deal for revenue tracking."
  });
}
function growthPlan(channel) {
  const c = channel || "organic";
  return JSON.stringify({
    channel: c,
    tactics: ["content marketing", "SEO", "social media", "referral program", "partnerships", "paid ads"],
    tip: "Use hall_referral for referral program. Use web_search for competitive research."
  });
}
function analyticsPlan(metric) {
  const m = metric || "conversion";
  return JSON.stringify({
    metric: m,
    tracking: ["page views", "clicks", "signups", "activations", "retention", "revenue"],
    tip: "Use analytics-tracking skill. Track with PostHog/Mixpanel/Amplitude."
  });
}
function feedbackPlan(source) {
  const s = source || "users";
  return JSON.stringify({
    source: s,
    channels: ["in-app survey", "NPS", "support tickets", "social listening", "user interviews"],
    tip: "Use hall_conviction for community feedback (skin-in-the-game)."
  });
}
function roadmapPlan(quarter) {
  const q = quarter || "Q1";
  return JSON.stringify({
    quarter: q,
    themes: ["core features", "growth", "reliability", "developer experience"],
    tip: "Use workflow_create for sprint planning."
  });
}
function changelogPlan(version) {
  const v = version || "1.0.0";
  return JSON.stringify({
    version: v,
    sections: ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"],
    tip: "Follow Keep a Changelog format."
  });
}
function readmePlan(project) {
  const p = project || "project";
  return JSON.stringify({
    project: p,
    sections: ["title + description", "installation", "usage", "API reference", "contributing", "license"],
    tip: "Use quill for copy. Use shaddai_quill for polished docs."
  });
}
function errorPlan(error) {
  const e = error || "error";
  return JSON.stringify({
    error: e,
    steps: ["reproduce", "isolate", "diagnose", "fix", "test", "deploy"],
    tip: "Use pikadon for security-related errors. Use nexus for technical diagnosis."
  });
}
function perfPlan(metric) {
  const m = metric || "latency";
  return JSON.stringify({
    metric: m,
    steps: ["measure baseline", "profile", "identify bottleneck", "optimize", "measure again", "compare"],
    tip: "Use tool_search to find profiling tools."
  });
}
function accessibilityPlan() {
  return JSON.stringify({
    checks: ["contrast (4.5:1)", "keyboard nav", "screen reader", "focus indicators", "ARIA labels", "reduced motion"],
    tip: "Use ui_resource 14 (webaim) for accessibility guidelines."
  });
}
function i18nPlan(langs) {
  const l = Array.isArray(langs) ? langs : ["en", "es", "fr"];
  return JSON.stringify({ languages: l, steps: ["extract strings", "translate", "RTL support", "date/number formats", "test"], tip: "Use i18n skills." });
}
function seoPlan(topic) {
  const t = topic || "product";
  return JSON.stringify({
    topic: t,
    steps: ["keyword research", "title/meta", "content optimization", "technical SEO", "backlinks", "monitor rankings"],
    tip: "Use google-search skill. Use seo-self-improve-loop workflow."
  });
}
function socialPlan(platform) {
  const p = platform || "twitter";
  return JSON.stringify({
    platform: p,
    steps: ["profile optimization", "content calendar", "engagement", "analytics", "growth"],
    tip: "Use socialPost tool for post generation."
  });
}
function emailPlan(type) {
  const t = type || "newsletter";
  return JSON.stringify({
    type: t,
    steps: ["list building", "segmentation", "template design", "A/B test", "send", "analyze"],
    tip: "Use emailSubject + emailTemplate tools."
  });
}
function adPlan(channel) {
  const c = channel || "google";
  return JSON.stringify({
    channel: c,
    steps: ["audience research", "creative", "landing page", "bid strategy", "launch", "optimize"],
    tip: "Use headlineGen + ctaGen for ad copy."
  });
}
function funnelPlan() {
  return JSON.stringify({
    stages: ["awareness", "interest", "consideration", "intent", "purchase", "loyalty", "advocacy"],
    tip: "Track conversion at each stage. Use analyticsPlan."
  });
}
function retentionPlan() {
  return JSON.stringify({
    tactics: ["onboarding", "activation", "engagement", "value delivery", "support", "reactivation"],
    tip: "Use hall_daily_bonus + hall_quests for gamification."
  });
}
function viralPlan() {
  return JSON.stringify({
    tactics: ["referral program", "shareable content", "social proof", "network effects", "UGC"],
    tip: "Use hall_referral for referral program."
  });
}
function communityPlan() {
  return JSON.stringify({
    platforms: ["discord", "telegram", "forum", "social media"],
    tactics: ["welcome", "engagement", "moderation", "events", "recognition"],
    tip: "Use hall_* tools for gamified community."
  });
}
function launchPlan(product) {
  const p = product || "product";
  return JSON.stringify({
    product: p,
    phases: ["pre-launch (tease)", "launch (announce)", "post-launch (iterate)", "scale"],
    tip: "Use hall_post for announcements. Use bridge_call for external agents."
  });
}
function pivotPlan() {
  return JSON.stringify({
    steps: ["analyze metrics", "identify problem", "hypothesize", "test", "decide", "execute"],
    tip: "Use shaddai_orchestrate for complex decisions."
  });
}
function scalePlan() {
  return JSON.stringify({
    areas: ["infrastructure", "team", "processes", "marketing", "support"],
    tip: "Use forge_spawn_sub for compound labor."
  });
}
function automatePlan(process) {
  const p = process || "process";
  return JSON.stringify({
    process: p,
    steps: ["identify repetitive tasks", "map inputs/outputs", "build automation", "test", "deploy", "monitor"],
    tip: "Use workflow_create + sched_add for automation."
  });
}
function integratePlan(service) {
  const s = service || "service";
  return JSON.stringify({
    service: s,
    steps: ["API research", "auth setup", "endpoint mapping", "error handling", "testing", "monitoring"],
    tip: "Use bridge_register for external agents."
  });
}
function migratePlan(from, to) {
  return JSON.stringify({
    from: from || "old", to: to || "new",
    steps: ["backup", "schema migration", "data migration", "testing", "cutover", "rollback plan"],
    tip: "Use db:migrate script."
  });
}
function monitorPlan(system) {
  const s = system || "system";
  return JSON.stringify({
    system: s,
    metrics: ["uptime", "latency", "error rate", "throughput", "resource usage"],
    tip: "Use sched_add for recurring checks."
  });
}
function backupPlan() {
  return JSON.stringify({
    steps: ["identify critical data", "backup schedule", "storage", "encryption", "test restore", "document"],
    tip: "Use db:backup script."
  });
}
function securityPlan() {
  return JSON.stringify({
    layers: ["auth", "input validation", "output encoding", "secrets management", "audit logging", "rate limiting"],
    tip: "Use pikadon for security review. Use PIKADON-SECURITY-REVIEW.md."
  });
}
function testPlanFull(feature) {
  const f = feature || "feature";
  return JSON.stringify({
    feature: f,
    types: ["unit", "integration", "e2e", "security", "performance", "accessibility"],
    tip: "Use npm run gate for jest + node checks."
  });
}
function docPlan(topic) {
  const t = topic || "topic";
  return JSON.stringify({
    topic: t,
    sections: ["overview", "getting started", "API reference", "examples", "troubleshooting", "FAQ"],
    tip: "Use shaddai_quill for polished docs."
  });
}
function apiPlan(resource) {
  const r = resource || "resource";
  return JSON.stringify({
    resource: r,
    endpoints: ["GET /" + r, "GET /" + r + "/:id", "POST /" + r, "PUT /" + r + "/:id", "DELETE /" + r + "/:id"],
    tip: "Use curl_build to generate curl commands."
  });
}

const EXTRA_TOOLS_3 = [
  { name: "headline_gen", description: "Generate marketing headlines for a topic.", inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] }, run: (a) => headlineGen(a.topic) },
  { name: "cta_gen", description: "Generate call-to-action buttons for a goal (sign up, buy, download, subscribe).", inputSchema: { type: "object", properties: { goal: { type: "string" } }, required: ["goal"] }, run: (a) => ctaGen(a.goal) },
  { name: "seo_title", description: "Generate SEO-optimized titles for a topic + keyword.", inputSchema: { type: "object", properties: { topic: { type: "string" }, keyword: { type: "string" } }, required: ["topic"] }, run: (a) => seoTitle(a.topic, a.keyword) },
  { name: "email_subject", description: "Generate email subject lines for a topic.", inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] }, run: (a) => emailSubject(a.topic) },
  { name: "social_post", description: "Generate a social media post for a topic + platform (twitter, linkedin, instagram, tiktok).", inputSchema: { type: "object", properties: { topic: { type: "string" }, platform: { type: "string" } }, required: ["topic"] }, run: (a) => socialPost(a.topic, a.platform) },
  { name: "color_harmony", description: "Color harmony info for a hex color.", inputSchema: { type: "object", properties: { hex: { type: "string" } }, required: [] }, run: (a) => colorHarmony(a.hex) },
  { name: "typography_scale", description: "Generate a modular typographic scale (base � ratio).", inputSchema: { type: "object", properties: { base: { type: "number" }, ratio: { type: "number" } }, required: [] }, run: (a) => typographyScale(a.base, a.ratio) },
  { name: "layout_grid", description: "Generate a responsive grid layout (columns, gutter).", inputSchema: { type: "object", properties: { cols: { type: "number" }, gutter: { type: "number" } }, required: [] }, run: (a) => layoutGrid(a.cols, a.gutter) },
  { name: "spacing_system", description: "Generate a spacing scale from a base unit.", inputSchema: { type: "object", properties: { base: { type: "number" } }, required: [] }, run: (a) => spacingSystem(a.base) },
  { name: "brand_voice", description: "Brand voice guidelines for a tone (professional, playful, luxury, technical).", inputSchema: { type: "object", properties: { tone: { type: "string" } }, required: [] }, run: (a) => brandVoice(a.tone) },
  { name: "landing_page_plan", description: "Plan a landing page (sections, tips).", inputSchema: { type: "object", properties: { product: { type: "string" } }, required: [] }, run: (a) => landingPagePlan(a.product) },
  { name: "email_template", description: "Generate an email template (welcome, newsletter, promo).", inputSchema: { type: "object", properties: { type: { type: "string" } }, required: [] }, run: (a) => emailTemplate(a.type) },
  { name: "seo_meta", description: "Generate SEO meta tags (title, description, keywords, og).", inputSchema: { type: "object", properties: { topic: { type: "string" }, keyword: { type: "string" } }, required: [] }, run: (a) => seoMeta(a.topic, a.keyword) },
  { name: "color_palette_from_seed", description: "Generate a deterministic color palette from a seed string.", inputSchema: { type: "object", properties: { seed: { type: "string" } }, required: [] }, run: (a) => colorPaletteFromSeed(a.seed) },
  { name: "qr_code_plan", description: "Plan a QR code (payload, format, size).", inputSchema: { type: "object", properties: { data: { type: "string" } }, required: [] }, run: (a) => qrCodePlan(a.data) },
  { name: "json_schema_gen", description: "Describe an inferred JSON schema from a sample.", inputSchema: { type: "object", properties: { sample: { type: "object" } }, required: [] }, run: (a) => jsonSchemaGen(a.sample) },
  { name: "regex_helper", description: "Regex helper with test strings and tips.", inputSchema: { type: "object", properties: { pattern: { type: "string" } }, required: [] }, run: (a) => regexHelper(a.pattern) },
  { name: "api_endpoint_plan", description: "Plan REST API endpoints for a resource.", inputSchema: { type: "object", properties: { resource: { type: "string" } }, required: [] }, run: (a) => apiEndpointPlan(a.resource) },
  { name: "db_schema_plan", description: "Plan a database schema for entities.", inputSchema: { type: "object", properties: { entities: { type: "array", items: { type: "string" } } }, required: [] }, run: (a) => dbSchemaPlan(a.entities) },
  { name: "test_plan", description: "Plan a test suite (unit, integration, e2e, security, perf, a11y).", inputSchema: { type: "object", properties: { feature: { type: "string" } }, required: [] }, run: (a) => testPlan(a.feature) },
  { name: "deploy_plan", description: "Plan a deployment (build, test, lint, audit, deploy, health, smoke).", inputSchema: { type: "object", properties: { env: { type: "string" } }, required: [] }, run: (a) => deployPlan(a.env) },
  { name: "onboarding_plan", description: "Plan a user onboarding flow.", inputSchema: { type: "object", properties: { product: { type: "string" } }, required: [] }, run: (a) => onboardingPlan(a.product) },
  { name: "pricing_plan", description: "Plan a pricing model (freemium, tiers).", inputSchema: { type: "object", properties: { model: { type: "string" } }, required: [] }, run: (a) => pricingPlan(a.model) },
  { name: "growth_plan", description: "Plan a growth strategy (channels, tactics).", inputSchema: { type: "object", properties: { channel: { type: "string" } }, required: [] }, run: (a) => growthPlan(a.channel) },
  { name: "analytics_plan", description: "Plan an analytics setup (metrics, tracking).", inputSchema: { type: "object", properties: { metric: { type: "string" } }, required: [] }, run: (a) => analyticsPlan(a.metric) },
  { name: "feedback_plan", description: "Plan a feedback collection system.", inputSchema: { type: "object", properties: { source: { type: "string" } }, required: [] }, run: (a) => feedbackPlan(a.source) },
  { name: "roadmap_plan", description: "Plan a product roadmap (quarter, themes).", inputSchema: { type: "object", properties: { quarter: { type: "string" } }, required: [] }, run: (a) => roadmapPlan(a.quarter) },
  { name: "changelog_plan", description: "Plan a changelog (Keep a Changelog format).", inputSchema: { type: "object", properties: { version: { type: "string" } }, required: [] }, run: (a) => changelogPlan(a.version) },
  { name: "readme_plan", description: "Plan a README (sections, tips).", inputSchema: { type: "object", properties: { project: { type: "string" } }, required: [] }, run: (a) => readmePlan(a.project) },
  { name: "error_plan", description: "Plan error handling (reproduce, isolate, diagnose, fix, test, deploy).", inputSchema: { type: "object", properties: { error: { type: "string" } }, required: [] }, run: (a) => errorPlan(a.error) },
  { name: "perf_plan", description: "Plan performance optimization (measure, profile, optimize).", inputSchema: { type: "object", properties: { metric: { type: "string" } }, required: [] }, run: (a) => perfPlan(a.metric) },
  { name: "accessibility_plan", description: "Plan accessibility audit (contrast, keyboard, screen reader, etc.).", inputSchema: { type: "object", properties: {}, required: [] }, run: accessibilityPlan },
  { name: "i18n_plan", description: "Plan internationalization (languages, steps).", inputSchema: { type: "object", properties: { langs: { type: "array", items: { type: "string" } } }, required: [] }, run: (a) => i18nPlan(a.langs) },
  { name: "seo_plan", description: "Plan SEO strategy (keywords, content, technical, backlinks).", inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: [] }, run: (a) => seoPlan(a.topic) },
  { name: "social_plan", description: "Plan social media strategy (profile, content, engagement).", inputSchema: { type: "object", properties: { platform: { type: "string" } }, required: [] }, run: (a) => socialPlan(a.platform) },
  { name: "email_plan", description: "Plan email marketing (list, segmentation, templates, A/B, send, analyze).", inputSchema: { type: "object", properties: { type: { type: "string" } }, required: [] }, run: (a) => emailPlan(a.type) },
  { name: "ad_plan", description: "Plan advertising (audience, creative, landing, bid, launch, optimize).", inputSchema: { type: "object", properties: { channel: { type: "string" } }, required: [] }, run: (a) => adPlan(a.channel) },
  { name: "funnel_plan", description: "Plan a conversion funnel (awareness -> advocacy).", inputSchema: { type: "object", properties: {}, required: [] }, run: funnelPlan },
  { name: "retention_plan", description: "Plan user retention (onboarding, activation, engagement, etc.).", inputSchema: { type: "object", properties: {}, required: [] }, run: retentionPlan },
  { name: "viral_plan", description: "Plan viral growth (referral, shareable, social proof, UGC).", inputSchema: { type: "object", properties: {}, required: [] }, run: viralPlan },
  { name: "community_plan", description: "Plan community building (platforms, tactics).", inputSchema: { type: "object", properties: {}, required: [] }, run: communityPlan },
  { name: "launch_plan", description: "Plan a product launch (pre-launch, launch, post-launch, scale).", inputSchema: { type: "object", properties: { product: { type: "string" } }, required: [] }, run: (a) => launchPlan(a.product) },
  { name: "pivot_plan", description: "Plan a product pivot (analyze, hypothesize, test, decide, execute).", inputSchema: { type: "object", properties: {}, required: [] }, run: pivotPlan },
  { name: "scale_plan", description: "Plan scaling (infrastructure, team, processes, marketing, support).", inputSchema: { type: "object", properties: {}, required: [] }, run: scalePlan },
  { name: "automate_plan", description: "Plan automation (identify, map, build, test, deploy, monitor).", inputSchema: { type: "object", properties: { process: { type: "string" } }, required: [] }, run: (a) => automatePlan(a.process) },
  { name: "integrate_plan", description: "Plan an integration (API research, auth, mapping, testing).", inputSchema: { type: "object", properties: { service: { type: "string" } }, required: [] }, run: (a) => integratePlan(a.service) },
  { name: "migrate_plan", description: "Plan a migration (backup, schema, data, test, cutover, rollback).", inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: [] }, run: (a) => migratePlan(a.from, a.to) },
  { name: "monitor_plan", description: "Plan monitoring (uptime, latency, errors, throughput, resources).", inputSchema: { type: "object", properties: { system: { type: "string" } }, required: [] }, run: (a) => monitorPlan(a.system) },
  { name: "backup_plan", description: "Plan backups (identify, schedule, storage, encrypt, test, document).", inputSchema: { type: "object", properties: {}, required: [] }, run: backupPlan },
  { name: "security_plan", description: "Plan security (auth, validation, encoding, secrets, audit, rate limit).", inputSchema: { type: "object", properties: {}, required: [] }, run: securityPlan },
  { name: "test_plan_full", description: "Plan a full test suite (unit, integration, e2e, security, perf, a11y).", inputSchema: { type: "object", properties: { feature: { type: "string" } }, required: [] }, run: (a) => testPlanFull(a.feature) },
  { name: "doc_plan", description: "Plan documentation (overview, getting started, API, examples, troubleshooting, FAQ).", inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: [] }, run: (a) => docPlan(a.topic) },
  { name: "api_plan", description: "Plan REST API endpoints for a resource.", inputSchema: { type: "object", properties: { resource: { type: "string" } }, required: [] }, run: (a) => apiPlan(a.resource) },
];
for (const t of EXTRA_TOOLS_3) {
  if (!CREATIVE_TOOLS.some(x => x.name === t.name)) CREATIVE_TOOLS.push(t);
}

// -- Discovery & retrievability tools (deeply rooted) ------------------------
function workflowSearch(query) {
  // Search workflows by keyword in name/description. Returns matching workflow names.
  // Note: actual workflow list comes from the backend store; this is a helper.
  return JSON.stringify({
    query: query || "",
    hint: "Use workflow_list to get all workflows, then filter by name/description. Or use tool_search for tools.",
    search_fields: ["name", "description", "steps[].tool"],
    tip: "Workflows are stored in eco-workflows.json (1326+). Use workflow_run with the workflow_id."
  });
}
function usecaseSearch(query) {
  return JSON.stringify({
    query: query || "",
    hint: "Use-case workflows are prefixed with 'uc-'. Use workflow_list and filter for 'uc-' prefix.",
    categories: ["research", "content", "security", "design", "crypto", "data", "community", "brain", "video", "game", "conversion", "finance", "astro", "hall", "memory", "encode", "math", "date", "network", "text", "color"],
    tip: "Each use-case workflow chains 2-5 tools into a real scenario."
  });
}
function intentRoute(task) {
  const t = (task || "").toLowerCase();
  const routes = [];
  if (/price|market|crypto|btc|eth|sol|trading|trade/.test(t)) routes.push({ tool: "zerox_price", why: "live crypto prices" }, { tool: "zerox_sentiment", why: "fear & greed" }, { workflow: "crypto-analysis-btc", why: "full crypto analysis" });
  if (/research|search|find|look up|what is/.test(t)) routes.push({ tool: "rag_search", why: "SHADDAI brain" }, { tool: "web_search", why: "live web" }, { workflow: "research-to-write", why: "research + write" });
  if (/write|copy|doc|email|post|blog|article/.test(t)) routes.push({ tool: "shaddai_quill", why: "writing specialist" }, { tool: "headline_gen", why: "headlines" }, { tool: "email_subject", why: "email subjects" });
  if (/design|color|palette|ui|layout|brand/.test(t)) routes.push({ tool: "turtle_palette", why: "color palette" }, { tool: "ui_stack", why: "UI stack" }, { tool: "landing_page_plan", why: "landing page" });
  if (/security|audit|secret|password|vuln/.test(t)) routes.push({ tool: "shaddai_pikadon", why: "security audit" }, { tool: "detect_secrets", why: "secret scan" }, { tool: "security_scrape_plan", why: "secure scrape" });
  if (/video|media|clip|transcribe/.test(t)) routes.push({ tool: "shaddai_media_status", why: "media engine" }, { tool: "video_pipeline_plan", why: "video pipeline" }, { tool: "motion_graphics_plan", why: "motion graphics" });
  if (/game|3d|three/.test(t)) routes.push({ tool: "gamedev_suite", why: "game dev tools" }, { tool: "styles_list", why: "film styles" });
  if (/workflow|automate|schedule/.test(t)) routes.push({ tool: "workflow_list", why: "list workflows" }, { tool: "sched_add", why: "schedule job" }, { tool: "automate_plan", why: "automation plan" });
  if (/data|json|csv|convert/.test(t)) routes.push({ tool: "json_format", why: "format JSON" }, { tool: "csv_stats", why: "CSV stats" });
  if (/finance|roi|margin|loan|mrr/.test(t)) routes.push({ tool: "roi", why: "ROI calc" }, { tool: "profit_margin", why: "margin" }, { tool: "ltv_cac", why: "unit economics" });
  if (routes.length === 0) routes.push({ tool: "tool_search", why: "search the catalog" }, { tool: "shaddai_orchestrate", why: "orchestrate complex task" });
  return JSON.stringify({ task: task || "", routes: routes.slice(0, 8), tip: "Call the suggested tools in order, or use workflow_run with a matching uc-* workflow." });
}
function skillSearch(query) {
  return JSON.stringify({
    query: query || "",
    hint: "The skills catalog has 3022 skills in data/skills-catalog.json. Search by keyword in name/description/agent/category.",
    agents: ["SHADDAI", "NEXUS", "ZEROX", "ORACLE", "TURTLE", "QUILL", "PIKADON"],
    categories: ["Marketing Skills", "Development", "Design", "Security", "Research", "Writing", "Finance", "DevOps"],
    tip: "Use shaddai_search_mastery for knowledge search. Use skill_search conceptually to find relevant skills."
  });
}
function toolRecommend(task) {
  return intentRoute(task); // alias
}
const DISCOVERY_TRIGGERS = [
  { name: "workflow_search", description: "Search workflows by keyword in name/description/steps. Returns matching workflows.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, run: (a) => workflowSearch(a.query) },
  { name: "usecase_search", description: "Search use-case workflows (uc-* prefix) by category or keyword.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: [] }, run: (a) => usecaseSearch(a.query) },
  { name: "intent_route", description: "Route a natural language task to the best tool(s) and workflow(s). Returns recommended calls with reasons.", inputSchema: { type: "object", properties: { task: { type: "string" } }, required: ["task"] }, run: (a) => intentRoute(a.task) },
  { name: "skill_search", description: "Search the 3022-skill catalog by keyword. Returns agents, categories, and search tips.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: [] }, run: (a) => skillSearch(a.query) },
  { name: "tool_recommend", description: "Alias for intent_route � recommend tools for a task.", inputSchema: { type: "object", properties: { task: { type: "string" } }, required: ["task"] }, run: (a) => toolRecommend(a.task) },
];
for (const t of DISCOVERY_TRIGGERS) {
  if (!CREATIVE_TOOLS.some(x => x.name === t.name)) CREATIVE_TOOLS.push(t);
}
function realEstateROI(price, rent, expenses) { const p=Number(price)||0, r=Number(rent)||0, e=Number(expenses)||0; const noi=r*12-e*12, cr=p>0?(noi/p*100):0; return JSON.stringify({ price:p, monthlyRent:r, monthlyExpenses:e, annualNOI:noi, capRate:cr.toFixed(2)+"%", monthlyCashFlow:(noi/12).toFixed(2), rule1pct: r>=p*0.01?"PASS":"FAIL" }); }
function mortgageCalc(price, rate, years, down) { const p=Number(price)||0, r=(Number(rate)||0)/100/12, n=(Number(years)||30)*12, dp=Number(down)||0, loan=p-dp; const pay=r>0?loan*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):loan/n; return JSON.stringify({ loanAmount:loan.toFixed(2), monthlyPayment:pay.toFixed(2), totalPaid:(pay*n).toFixed(2), totalInterest:(pay*n-loan).toFixed(2) }); }
function saasMetrics(mrr, customers, churn, cac) { const m=Number(mrr)||0, c=Number(customers)||1, ch=Number(churn)||0, ca=Number(cac)||0; const arr=m*12, arpu=m/c, ltv=ch>0?arpu/ch:arpu*24, ratio=ca>0?ltv/ca:0; return JSON.stringify({ mrr:m, arr:arr, arpu:arpu.toFixed(2), churnRate:ch+"%", ltv:ltv.toFixed(2), cac:ca, ltvCacRatio:ratio.toFixed(2), health: ratio>=3?"healthy":ratio>=1?"ok":"unhealthy" }); }
function ecommerceMargin(price, cost, shipping, fees) { const p=Number(price)||0, c=Number(cost)||0, s=Number(shipping)||0, f=Number(fees)||0; const profit=p-c-s-f, margin=p>0?(profit/p*100):0; return JSON.stringify({ price:p, cost:c, shipping:s, fees:f, profit:profit.toFixed(2), margin:margin.toFixed(2)+"%" }); }
function hiringScore(skills, experience, culture) { const s=Number(skills)||0, e=Number(experience)||0, c=Number(culture)||0; const total=s*0.4+e*0.35+c*0.25; return JSON.stringify({ weightedScore:total.toFixed(2), rating: total>=80?"strong hire":total>=60?"hire":total>=40?"maybe":"pass" }); }
const RT1 = [
  { name:"real_estate_roi", description:"Real estate ROI: cap rate, cash flow, 1% rule.", inputSchema:{type:"object",properties:{price:{type:"number"},rent:{type:"number"},expenses:{type:"number"}},required:["price","rent"]}, run:(a)=>realEstateROI(a.price,a.rent,a.expenses) },
  { name:"mortgage_calc", description:"Mortgage calculator: payment, total interest.", inputSchema:{type:"object",properties:{price:{type:"number"},rate:{type:"number"},years:{type:"number"},down:{type:"number"}},required:["price","rate"]}, run:(a)=>mortgageCalc(a.price,a.rate,a.years,a.down) },
  { name:"saas_metrics", description:"SaaS metrics: MRR, ARR, ARPU, LTV, CAC, health.", inputSchema:{type:"object",properties:{mrr:{type:"number"},customers:{type:"number"},churn:{type:"number"},cac:{type:"number"}},required:["mrr","customers"]}, run:(a)=>saasMetrics(a.mrr,a.customers,a.churn,a.cac) },
  { name:"ecommerce_margin", description:"E-commerce margin & markup.", inputSchema:{type:"object",properties:{price:{type:"number"},cost:{type:"number"},shipping:{type:"number"},fees:{type:"number"}},required:["price"]}, run:(a)=>ecommerceMargin(a.price,a.cost,a.shipping,a.fees) },
  { name:"hiring_score", description:"Hiring score (skills, experience, culture).", inputSchema:{type:"object",properties:{skills:{type:"number"},experience:{type:"number"},culture:{type:"number"}},required:[]}, run:(a)=>hiringScore(a.skills,a.experience,a.culture) },
];
for (const t of RT1) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }
function salaryBenchmark(role, level, location) { const r=(role||"engineer").toLowerCase(), l=(level||"mid").toLowerCase(), loc=(location||"us").toLowerCase(); const base={engineer:{junior:75000,mid:120000,senior:170000,lead:220000},designer:{junior:65000,mid:100000,senior:140000,lead:180000},pm:{junior:80000,mid:130000,senior:180000,lead:230000}}; const mult={us:1.0,eu:0.85,asia:0.6,remote:0.9}; const b=(base[r]||base.engineer)[l]||100000; const m=mult[loc]||1.0; return JSON.stringify({ role:r, level:l, location:loc, baseSalary:Math.round(b*m), range:[Math.round(b*m*0.9),Math.round(b*m*1.1)], currency:"USD" }); }
function legalContractCheck(clauses) { const c=Array.isArray(clauses)?clauses:[]; const required=["termination","liability","confidentiality","payment","ip","dispute"]; const missing=required.filter(r=>!c.some(cl=>String(cl).toLowerCase().includes(r))); return JSON.stringify({ provided:c.length, required:required.length, missing:missing, complete:missing.length===0, score:Math.round((required.length-missing.length)/required.length*100)+"%" }); }
function complianceChecklist(industry) { const i=(industry||"saas").toLowerCase(); const lists={saas:["GDPR","SOC2","CCPA","Terms of Service","Privacy Policy","Cookie Consent","DPA"],finance:["PCI-DSS","SOX","AML/KYC","GDPR","State licenses"],healthcare:["HIPAA","HITECH","FDA","GDPR"],ecommerce:["PCI-DSS","GDPR","CCPA","Consumer protection","Tax compliance"]}; const cl=lists[i]||lists.saas; return JSON.stringify({ industry:i, checklist:cl, count:cl.length }); }
function customerLifetimeValue(revenue, cost, lifespan) { const r=Number(revenue)||0, c=Number(cost)||0, l=Number(lifespan)||12; const profit=r-c, ltv=profit*l; return JSON.stringify({ monthlyRevenue:r, monthlyCost:c, monthlyProfit:profit, lifespanMonths:l, ltv:ltv.toFixed(2) }); }
function churnAnalysis(customers, churned) { const c=Number(customers)||1, ch=Number(churned)||0; const rate=(ch/c*100).toFixed(2); return JSON.stringify({ customers:c, churned:ch, retained:c-ch, churnRate:rate+"%", health: parseFloat(rate)<5?"healthy":parseFloat(rate)<10?"warning":"critical" }); }
function conversionFunnel(visitors, signups, activations, purchases) { const v=Number(visitors)||1, s=Number(signups)||0, a=Number(activations)||0, p=Number(purchases)||0; return JSON.stringify({ visitors:v, signups:s, activations:a, purchases:p, signupRate:(s/v*100).toFixed(2)+"%", activationRate:(s>0?(a/s*100).toFixed(2):"0")+"%", purchaseRate:(a>0?(p/a*100).toFixed(2):"0")+"%", overallConversion:(p/v*100).toFixed(2)+"%" }); }
function abTestCalc(visitorsA, conversionsA, visitorsB, conversionsB) { const va=Number(visitorsA)||1, ca=Number(conversionsA)||0, vb=Number(visitorsB)||1, cb=Number(conversionsB)||0; const rateA=ca/va, rateB=cb/vb, lift=rateA>0?((rateB-rateA)/rateA*100):0; return JSON.stringify({ variantA:{visitors:va,conversions:ca,rate:(rateA*100).toFixed(2)+"%"}, variantB:{visitors:vb,conversions:cb,rate:(rateB*100).toFixed(2)+"%"}, lift:lift.toFixed(2)+"%", winner: rateB>rateA?"B":rateA>rateB?"A":"tie" }); }
function npsScore(promoters, passives, detractors) { const p=Number(promoters)||0, pa=Number(passives)||0, d=Number(detractors)||0, total=p+pa+d; const nps=total>0?((p-d)/total*100):0; return JSON.stringify({ promoters:p, passives:pa, detractors:d, total:total, nps:Math.round(nps), rating: nps>=50?"excellent":nps>=0?"good":nps>=-50?"needs work":"critical" }); }
function marketSize(tam, sam, som) { const t=Number(tam)||0, s=Number(sam)||0, so=Number(som)||0; return JSON.stringify({ tam:t, sam:s, som:so, penetration: t>0?(so/t*100).toFixed(2)+"%":"n/a" }); }
function pricingStrategy(cost, value, competitor) { const c=Number(cost)||0, v=Number(value)||0, comp=Number(competitor)||0; return JSON.stringify({ cost:c, perceivedValue:v, competitorPrice:comp, costPlus:c*2, valueBased:v*0.1, competitive:comp*0.95, recommended:Math.max(c*2, comp*0.95) }); }
const RT2 = [
  { name:"salary_benchmark", description:"Salary benchmark (role, level, location).", inputSchema:{type:"object",properties:{role:{type:"string"},level:{type:"string"},location:{type:"string"}},required:[]}, run:(a)=>salaryBenchmark(a.role,a.level,a.location) },
  { name:"legal_contract_check", description:"Legal contract clause check (clauses array).", inputSchema:{type:"object",properties:{clauses:{type:"array",items:{type:"string"}}},required:["clauses"]}, run:(a)=>legalContractCheck(a.clauses) },
  { name:"compliance_checklist", description:"Compliance checklist by industry (saas, finance, healthcare, ecommerce).", inputSchema:{type:"object",properties:{industry:{type:"string"}},required:[]}, run:(a)=>complianceChecklist(a.industry) },
  { name:"customer_lifetime_value", description:"Customer LTV (revenue, cost, lifespan).", inputSchema:{type:"object",properties:{revenue:{type:"number"},cost:{type:"number"},lifespan:{type:"number"}},required:["revenue"]}, run:(a)=>customerLifetimeValue(a.revenue,a.cost,a.lifespan) },
  { name:"churn_analysis", description:"Churn analysis (customers, churned).", inputSchema:{type:"object",properties:{customers:{type:"number"},churned:{type:"number"}},required:["customers","churned"]}, run:(a)=>churnAnalysis(a.customers,a.churned) },
  { name:"conversion_funnel", description:"Conversion funnel (visitors, signups, activations, purchases).", inputSchema:{type:"object",properties:{visitors:{type:"number"},signups:{type:"number"},activations:{type:"number"},purchases:{type:"number"}},required:["visitors"]}, run:(a)=>conversionFunnel(a.visitors,a.signups,a.activations,a.purchases) },
  { name:"ab_test_calc", description:"A/B test calculator (visitorsA, conversionsA, visitorsB, conversionsB).", inputSchema:{type:"object",properties:{visitorsA:{type:"number"},conversionsA:{type:"number"},visitorsB:{type:"number"},conversionsB:{type:"number"}},required:["visitorsA","conversionsA","visitorsB","conversionsB"]}, run:(a)=>abTestCalc(a.visitorsA,a.conversionsA,a.visitorsB,a.conversionsB) },
  { name:"nps_score", description:"NPS (promoters, passives, detractors).", inputSchema:{type:"object",properties:{promoters:{type:"number"},passives:{type:"number"},detractors:{type:"number"}},required:["promoters","detractors"]}, run:(a)=>npsScore(a.promoters,a.passives,a.detractors) },
  { name:"market_size", description:"Market size TAM/SAM/SOM.", inputSchema:{type:"object",properties:{tam:{type:"number"},sam:{type:"number"},som:{type:"number"}},required:["tam"]}, run:(a)=>marketSize(a.tam,a.sam,a.som) },
  { name:"pricing_strategy", description:"Pricing strategy (cost, value, competitor).", inputSchema:{type:"object",properties:{cost:{type:"number"},value:{type:"number"},competitor:{type:"number"}},required:["cost"]}, run:(a)=>pricingStrategy(a.cost,a.value,a.competitor) },
  { name:"seo_keyword_score", description:"SEO keyword opportunity (keyword, volume, difficulty).", inputSchema:{type:"object",properties:{keyword:{type:"string"},volume:{type:"number"},difficulty:{type:"number"}},required:["keyword"]}, run:(a)=>seoKeywordScore(a.keyword,a.volume,a.difficulty) },
  { name:"email_deliverability", description:"Email deliverability (spf, dkim, dmarc, reputation).", inputSchema:{type:"object",properties:{spf:{type:"boolean"},dkim:{type:"boolean"},dmarc:{type:"boolean"},reputation:{type:"number"}},required:[]}, run:(a)=>emailDeliverabilityScore(a.spf,a.dkim,a.dmarc,a.reputation) },
  { name:"uptime_sla", description:"Uptime SLA check (uptime, target).", inputSchema:{type:"object",properties:{uptime:{type:"number"},target:{type:"number"}},required:["uptime"]}, run:(a)=>uptimeSLA(a.uptime,a.target) },
  { name:"api_rate_limit", description:"API rate limit check (requests, window, limit).", inputSchema:{type:"object",properties:{requests:{type:"number"},window:{type:"number"},limit:{type:"number"}},required:["requests"]}, run:(a)=>apiRateLimit(a.requests,a.window,a.limit) },
  { name:"cache_hit_rate", description:"Cache hit rate (hits, misses).", inputSchema:{type:"object",properties:{hits:{type:"number"},misses:{type:"number"}},required:["hits","misses"]}, run:(a)=>cacheHitRate(a.hits,a.misses) },
  { name:"error_rate", description:"Error rate (errors, total).", inputSchema:{type:"object",properties:{errors:{type:"number"},total:{type:"number"}},required:["errors","total"]}, run:(a)=>errorRate(a.errors,a.total) },
];
for (const t of RT2) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }
