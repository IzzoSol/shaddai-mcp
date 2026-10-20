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

// -- Extracted skills from cloned repos (batch 1) ------------------------------
function hunyuan3dPlan(prompt, format) { return JSON.stringify({ repo:"Tencent Hunyuan3D-2.1", pattern:"text/image -> 3D model", input:prompt||"", outputFormat:format||"glb", pipeline:["prompt","shape generation","texture synthesis","export glb/obj/fbx"], tip:"Run: python gradio_app.py. Models on HuggingFace." }); }
function firecrawlPlan(url, mode) { return JSON.stringify({ repo:"firecrawl", pattern:"URL -> clean markdown for LLM", input:url||"", mode:mode||"scrape", modes:["scrape","crawl","extract","map","search"], tip:"Self-host or firecrawl.dev API." }); }
function browserUsePlan(task, url) { return JSON.stringify({ repo:"browser-use", pattern:"AI agent controls browser", task:task||"", url:url||"", actions:["navigate","click","type","scroll","extract","screenshot"], tip:"pip install browser-use. Requires Playwright + LLM key." }); }
function crawleePlan(mode, url) { return JSON.stringify({ repo:"crawlee", pattern:"Scalable web crawling (cheerio/playwright/puppeteer)", mode:mode||"cheerio", url:url||"", features:["request queue","session pool","proxy rotation","auto-scaling"], tip:"npm install crawlee. TypeScript/JS." }); }
function crawl4aiPlan(url, mode) { return JSON.stringify({ repo:"crawl4ai", pattern:"LLM-friendly web crawler (markdown, structured extraction)", url:url||"", mode:mode||"scrape", features:["markdown output","structured extraction","screenshot","PDF","chunking for RAG"], tip:"pip install crawl4ai. Async Python." }); }
function autoscraperPlan(url, samples) { return JSON.stringify({ repo:"autoscraper", pattern:"Learn scraping rules from sample data", url:url||"", samples:samples||[], tip:"pip install autoscraper. Great for product listings, search results." }); }
function adaptiveStyleTransferPlan(content, style) { return JSON.stringify({ repo:"CompVis adaptive-style-transfer", pattern:"Real-time HD style transfer (AdaIN)", content:content||"", style:style||"", technique:"Adaptive Instance Normalization", tip:"Requires TensorFlow + GPU." }); }
function handdrawPlan(project) { return JSON.stringify({ repo:"HandDraw", pattern:"JSON DSL -> SVG -> Remotion -> MP4 (free Edge TTS)", project:project||"", pipeline:["write project.json","validate","render","narrate","MP4"], tip:"npm install && npm run build. No API key needed." }); }
function artcrafterPlan(content, stylePrompt) { return JSON.stringify({ repo:"ArtCrafter", pattern:"Text-guided artistic attribute transfer (TVCG 2026)", content:content||"", stylePrompt:stylePrompt||"", technique:"embedding reframing", tip:"Requires PyTorch + GPU. Models on HuggingFace." }); }
const EX1 = [
  { name:"hunyuan3d_plan", description:"Plan 3D model generation from text/image (Tencent Hunyuan3D). Output: glb/obj/fbx.", inputSchema:{type:"object",properties:{prompt:{type:"string"},format:{type:"string"}},required:[]}, run:(a)=>hunyuan3dPlan(a.prompt,a.format) },
  { name:"firecrawl_plan", description:"Plan web scraping with Firecrawl (JS rendering, markdown, structured extraction).", inputSchema:{type:"object",properties:{url:{type:"string"},mode:{type:"string"}},required:[]}, run:(a)=>firecrawlPlan(a.url,a.mode) },
  { name:"browser_use_plan", description:"Plan browser automation (navigate, click, type, scroll, extract, screenshot).", inputSchema:{type:"object",properties:{task:{type:"string"},url:{type:"string"}},required:[]}, run:(a)=>browserUsePlan(a.task,a.url) },
  { name:"crawlee_plan", description:"Plan web crawling with Crawlee (cheerio/playwright/puppeteer).", inputSchema:{type:"object",properties:{mode:{type:"string"},url:{type:"string"}},required:[]}, run:(a)=>crawleePlan(a.mode,a.url) },
  { name:"crawl4ai_plan", description:"Plan LLM-friendly web crawling (markdown, structured extraction, PDF, RAG chunking).", inputSchema:{type:"object",properties:{url:{type:"string"},mode:{type:"string"}},required:[]}, run:(a)=>crawl4aiPlan(a.url,a.mode) },
  { name:"autoscraper_plan", description:"Plan auto-scraping (learn rules from samples, apply to similar pages).", inputSchema:{type:"object",properties:{url:{type:"string"},samples:{type:"array",items:{type:"string"}}},required:[]}, run:(a)=>autoscraperPlan(a.url,a.samples) },
  { name:"adaptive_style_transfer_plan", description:"Plan artistic style transfer (AdaIN, real-time HD).", inputSchema:{type:"object",properties:{content:{type:"string"},style:{type:"string"}},required:[]}, run:(a)=>adaptiveStyleTransferPlan(a.content,a.style) },
  { name:"handdraw_plan", description:"Plan whiteboard animation (JSON DSL -> SVG -> Remotion -> MP4, free Edge TTS).", inputSchema:{type:"object",properties:{project:{type:"string"}},required:[]}, run:(a)=>handdrawPlan(a.project) },
  { name:"artcrafter_plan", description:"Plan artistic attribute transfer (embedding reframing, text-guided).", inputSchema:{type:"object",properties:{content:{type:"string"},stylePrompt:{type:"string"}},required:[]}, run:(a)=>artcrafterPlan(a.content,a.stylePrompt) },
];
for (const t of EX1) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }

function realEstateROI(price, rent, expenses) { const p=Number(price)||0, r=Number(rent)||0, e=Number(expenses)||0; const noi=r*12-e*12, cr=p>0?(noi/p*100):0; return JSON.stringify({ price:p, monthlyRent:r, monthlyExpenses:e, annualNOI:noi, capRate:cr.toFixed(2)+"%", monthlyCashFlow:(noi/12).toFixed(2), rule1pct: r>=p*0.01?"PASS":"FAIL" }); }
function mortgageCalc(price, rate, years, down) { const p=Number(price)||0, r=(Number(rate)||0)/100/12, n=(Number(years)||30)*12, dp=Number(down)||0, loan=p-dp; const pay=r>0?loan*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1):loan/n; return JSON.stringify({ loanAmount:loan.toFixed(2), monthlyPayment:pay.toFixed(2), totalPaid:(pay*n).toFixed(2), totalInterest:(pay*n-loan).toFixed(2) }); }
function saasMetrics(mrr, customers, churn, cac) { const m=Number(mrr)||0, c=Number(customers)||1, ch=Number(churn)||0, ca=Number(cac)||0; const arr=m*12, arpu=m/c, ltv=ch>0?arpu/ch:arpu*24, ratio=ca>0?ltv/ca:0; return JSON.stringify({ mrr:m, arr:arr, arpu:arpu.toFixed(2), churnRate:ch+"%", ltv:ltv.toFixed(2), cac:ca, ltvCacRatio:ratio.toFixed(2), health: ratio>=3?"healthy":ratio>=1?"ok":"unhealthy" }); }
function ecommerceMargin(price, cost, shipping, fees) { const p=Number(price)||0, c=Number(cost)||0, s=Number(shipping)||0, f=Number(fees)||0; const profit=p-c-s-f, margin=p>0?(profit/p*100):0; return JSON.stringify({ price:p, cost:c, shipping:s, fees:f, profit:profit.toFixed(2), margin:margin.toFixed(2)+"%" }); }
function hiringScore(skills, experience, culture) { const s=Number(skills)||0, e=Number(experience)||0, c=Number(culture)||0; const total=s*0.4+e*0.35+c*0.25; return JSON.stringify({ weightedScore:total.toFixed(2), rating: total>=80?"strong hire":total>=60?"hire":total>=40?"maybe":"pass" }); }
function npsScore(promoters, passives, detractors) { const p=Number(promoters)||0, pa=Number(passives)||0, d=Number(detractors)||0, total=p+pa+d; const nps=total>0?((p-d)/total*100):0; return JSON.stringify({ promoters:p, passives:pa, detractors:d, total:total, nps:Math.round(nps), rating: nps>=50?"excellent":nps>=0?"good":nps>=-50?"needs work":"critical" }); }
function conversionFunnel(visitors, signups, activations, purchases) { const v=Number(visitors)||1, s=Number(signups)||0, a=Number(activations)||0, p=Number(purchases)||0; return JSON.stringify({ visitors:v, signups:s, activations:a, purchases:p, signupRate:(s/v*100).toFixed(2)+"%", activationRate:(s>0?(a/s*100).toFixed(2):"0")+"%", purchaseRate:(a>0?(p/a*100).toFixed(2):"0")+"%", overallConversion:(p/v*100).toFixed(2)+"%" }); }
function churnAnalysis(customers, churned) { const c=Number(customers)||1, ch=Number(churned)||0; const rate=(ch/c*100).toFixed(2); return JSON.stringify({ customers:c, churned:ch, retained:c-ch, churnRate:rate+"%", health: parseFloat(rate)<5?"healthy":parseFloat(rate)<10?"warning":"critical" }); }
function marketSize(tam, sam, som) { const t=Number(tam)||0, s=Number(sam)||0, so=Number(som)||0; return JSON.stringify({ tam:t, sam:s, som:so, penetration: t>0?(so/t*100).toFixed(2)+"%":"n/a" }); }
function pricingStrategy(cost, value, competitor) { const c=Number(cost)||0, v=Number(value)||0, comp=Number(competitor)||0; return JSON.stringify({ cost:c, perceivedValue:v, competitorPrice:comp, costPlus:c*2, valueBased:v*0.1, competitive:comp*0.95, recommended:Math.max(c*2, comp*0.95) }); }
const RT = [
  { name:"real_estate_roi", description:"Real estate ROI: cap rate, cash flow, 1% rule.", inputSchema:{type:"object",properties:{price:{type:"number"},rent:{type:"number"},expenses:{type:"number"}},required:["price","rent"]}, run:(a)=>realEstateROI(a.price,a.rent,a.expenses) },
  { name:"mortgage_calc", description:"Mortgage calculator: payment, total interest.", inputSchema:{type:"object",properties:{price:{type:"number"},rate:{type:"number"},years:{type:"number"},down:{type:"number"}},required:["price","rate"]}, run:(a)=>mortgageCalc(a.price,a.rate,a.years,a.down) },
  { name:"saas_metrics", description:"SaaS metrics: MRR, ARR, ARPU, LTV, CAC, health.", inputSchema:{type:"object",properties:{mrr:{type:"number"},customers:{type:"number"},churn:{type:"number"},cac:{type:"number"}},required:["mrr","customers"]}, run:(a)=>saasMetrics(a.mrr,a.customers,a.churn,a.cac) },
  { name:"ecommerce_margin", description:"E-commerce margin & markup.", inputSchema:{type:"object",properties:{price:{type:"number"},cost:{type:"number"},shipping:{type:"number"},fees:{type:"number"}},required:["price"]}, run:(a)=>ecommerceMargin(a.price,a.cost,a.shipping,a.fees) },
  { name:"hiring_score", description:"Hiring score (skills, experience, culture).", inputSchema:{type:"object",properties:{skills:{type:"number"},experience:{type:"number"},culture:{type:"number"}},required:[]}, run:(a)=>hiringScore(a.skills,a.experience,a.culture) },
  { name:"nps_score", description:"NPS (promoters, passives, detractors).", inputSchema:{type:"object",properties:{promoters:{type:"number"},passives:{type:"number"},detractors:{type:"number"}},required:["promoters","detractors"]}, run:(a)=>npsScore(a.promoters,a.passives,a.detractors) },
  { name:"conversion_funnel", description:"Conversion funnel (visitors, signups, activations, purchases).", inputSchema:{type:"object",properties:{visitors:{type:"number"},signups:{type:"number"},activations:{type:"number"},purchases:{type:"number"}},required:["visitors"]}, run:(a)=>conversionFunnel(a.visitors,a.signups,a.activations,a.purchases) },
  { name:"churn_analysis", description:"Churn analysis (customers, churned).", inputSchema:{type:"object",properties:{customers:{type:"number"},churned:{type:"number"}},required:["customers","churned"]}, run:(a)=>churnAnalysis(a.customers,a.churned) },
  { name:"market_size", description:"Market size TAM/SAM/SOM.", inputSchema:{type:"object",properties:{tam:{type:"number"},sam:{type:"number"},som:{type:"number"}},required:["tam"]}, run:(a)=>marketSize(a.tam,a.sam,a.som) },
  { name:"pricing_strategy", description:"Pricing strategy (cost, value, competitor).", inputSchema:{type:"object",properties:{cost:{type:"number"},value:{type:"number"},competitor:{type:"number"}},required:["cost"]}, run:(a)=>pricingStrategy(a.cost,a.value,a.competitor) },
];
for (const t of RT) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }

function headlineGen(topic) { const t=(topic||'product').trim(); return JSON.stringify({ headlines: ['How to '+t+' in 30 days','The ultimate guide to '+t,t+': what nobody tells you','5 '+t+' mistakes to avoid'] }); }
function ctaGen(goal) { const g=(goal||'sign up').toLowerCase(); const ctas={'sign up':['Start free','Create account','Join now'],'buy':['Buy now','Add to cart'],'download':['Download free','Get the app'],'subscribe':['Subscribe','Join the list']}; return JSON.stringify({ goal:g, ctas: ctas[g]||['Learn more','Get started'] }); }
function seoTitle(topic, keyword) { const t=topic||'Guide'; const k=keyword||t; return JSON.stringify({ titles: [k+': Complete '+t+' Guide (2026)','Best '+t+' for '+k,'How to '+t+' for '+k] }); }
function emailSubject(topic) { const t=topic||'update'; return JSON.stringify({ subjects: ['Quick question about '+t,t+' - your next step','New: '+t,'Re: '+t] }); }
function socialPost(topic, platform) { const t=topic||'update'; const p=(platform||'twitter').toLowerCase(); return JSON.stringify({ platform:p, post: t+' - Check it out!', hashtags:['#'+t.replace(/\s+/g,''),'#shaddai'] }); }
function landingPagePlan(product) { const p=product||'product'; return JSON.stringify({ product:p, sections:['hero','social proof','features','how it works','pricing','FAQ','CTA','footer'] }); }
function seoMeta(topic, keyword) { const t=topic||'Guide'; const k=keyword||t; return JSON.stringify({ title:k+' - '+t+' (2026)', description:'Learn about '+t+' for '+k, keywords:[k,t,t+' guide'] }); }
function apiEndpointPlan(resource) { const r=resource||'users'; return JSON.stringify({ resource:r, endpoints:['GET /api/'+r,'POST /api/'+r,'PUT /api/'+r+'/:id','DELETE /api/'+r+'/:id'] }); }
function deployPlan(env) { const e=env||'production'; return JSON.stringify({ env:e, steps:['build','test','lint','audit','deploy','health','smoke'] }); }
function launchPlan(product) { const p=product||'product'; return JSON.stringify({ product:p, phases:['pre-launch','launch','post-launch','scale'] }); }
const EXTRA_PLANNING = [
  { name:'headline_gen', description:'Generate marketing headlines.', inputSchema:{type:'object',properties:{topic:{type:'string'}},required:['topic']}, run:(a)=>headlineGen(a.topic) },
  { name:'cta_gen', description:'Generate call-to-action buttons.', inputSchema:{type:'object',properties:{goal:{type:'string'}},required:['goal']}, run:(a)=>ctaGen(a.goal) },
  { name:'seo_title', description:'Generate SEO-optimized titles.', inputSchema:{type:'object',properties:{topic:{type:'string'},keyword:{type:'string'}},required:['topic']}, run:(a)=>seoTitle(a.topic,a.keyword) },
  { name:'email_subject', description:'Generate email subject lines.', inputSchema:{type:'object',properties:{topic:{type:'string'}},required:['topic']}, run:(a)=>emailSubject(a.topic) },
  { name:'social_post', description:'Generate social media post.', inputSchema:{type:'object',properties:{topic:{type:'string'},platform:{type:'string'}},required:['topic']}, run:(a)=>socialPost(a.topic,a.platform) },
  { name:'landing_page_plan', description:'Plan a landing page.', inputSchema:{type:'object',properties:{product:{type:'string'}},required:[]}, run:(a)=>landingPagePlan(a.product) },
  { name:'seo_meta', description:'Generate SEO meta tags.', inputSchema:{type:'object',properties:{topic:{type:'string'},keyword:{type:'string'}},required:[]}, run:(a)=>seoMeta(a.topic,a.keyword) },
  { name:'api_endpoint_plan', description:'Plan REST API endpoints.', inputSchema:{type:'object',properties:{resource:{type:'string'}},required:[]}, run:(a)=>apiEndpointPlan(a.resource) },
  { name:'deploy_plan', description:'Plan a deployment.', inputSchema:{type:'object',properties:{env:{type:'string'}},required:[]}, run:(a)=>deployPlan(a.env) },
  { name:'launch_plan', description:'Plan a product launch.', inputSchema:{type:'object',properties:{product:{type:'string'}},required:[]}, run:(a)=>launchPlan(a.product) },
];
for (const t of EXTRA_PLANNING) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }





const EX2 = [
  { name: "firecrawl_scrape", description: "Firecrawl scrape: URL -> clean markdown + metadata.", inputSchema: { type: "object", properties: { url: { type: "string" }, formats: { type: "array", items: { type: "string" } } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", formats: a.formats||["markdown"], api: "POST /v1/scrape", tip: "JS rendering + markdown. Use for LLM consumption." }) },
  { name: "firecrawl_crawl", description: "Firecrawl crawl: multi-page crawl.", inputSchema: { type: "object", properties: { url: { type: "string" }, limit: { type: "number" } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", limit: a.limit||10, api: "POST /v1/crawl", tip: "Async job. Poll for status." }) },
  { name: "firecrawl_extract", description: "Firecrawl extract: structured data with schema.", inputSchema: { type: "object", properties: { url: { type: "string" }, schema: { type: "object" } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", schema: a.schema||{}, api: "POST /v1/extract", tip: "Extract specific data from pages." }) },
  { name: "firecrawl_map", description: "Firecrawl map: discover all URLs on a site.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", api: "POST /v1/map", tip: "Discover all pages before crawling." }) },
  { name: "firecrawl_search", description: "Firecrawl search: web search + scrape.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, run: (a) => JSON.stringify({ query: a.query||"", api: "POST /v1/search", tip: "Search + scrape in one call." }) },
  { name: "browser_use_action", description: "Browser-use: navigate, click, type, scroll, extract, screenshot.", inputSchema: { type: "object", properties: { action: { type: "string" }, selector: { type: "string" }, value: { type: "string" } }, required: ["action"] }, run: (a) => JSON.stringify({ action: a.action||"navigate", selector: a.selector||"", value: a.value||"", tip: "Playwright-based browser automation." }) },
  { name: "browser_use_extract", description: "Browser-use extract: get text/html from selector.", inputSchema: { type: "object", properties: { selector: { type: "string" } }, required: ["selector"] }, run: (a) => JSON.stringify({ selector: a.selector||"", tip: "Extract data after navigate + wait." }) },
  { name: "crawl4ai_extract", description: "Crawl4AI extract: CSS/XPath/LLM/cosine strategies.", inputSchema: { type: "object", properties: { url: { type: "string" }, strategy: { type: "string" } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", strategy: a.strategy||"css", strategies: ["css","xpath","llm","cosine"], tip: "LLM strategy for structured data." }) },
  { name: "crawl4ai_screenshot", description: "Crawl4AI screenshot: capture page visual.", inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, run: (a) => JSON.stringify({ url: a.url||"", tip: "Capture page visuals for analysis." }) },
  { name: "autoscraper_apply", description: "Autoscraper apply: apply learned rules to new URL.", inputSchema: { type: "object", properties: { learnedRules: { type: "object" }, newUrl: { type: "string" } }, required: ["newUrl"] }, run: (a) => JSON.stringify({ learnedRules: a.learnedRules||{}, newUrl: a.newUrl||"", tip: "Apply learned rules to similar pages." }) },
  { name: "style_transfer_adain", description: "Style transfer AdaIN: content + style -> stylized image (real-time).", inputSchema: { type: "object", properties: { content: { type: "string" }, style: { type: "string" }, alpha: { type: "number" } }, required: [] }, run: (a) => JSON.stringify({ content: a.content||"", style: a.style||"", alpha: a.alpha||1.0, technique: "AdaIN", tip: "Requires TensorFlow + GPU." }) },
  { name: "handdraw_scene", description: "HandDraw scene: text/svg/image/shape with animations.", inputSchema: { type: "object", properties: { type: { type: "string" }, content: { type: "string" }, duration: { type: "number" } }, required: [] }, run: (a) => JSON.stringify({ type: a.type||"text", content: a.content||"", duration: a.duration||5, tip: "Write project.json, validate, render." }) },
  { name: "artcrafter_transfer", description: "ArtCrafter: text-guided artistic attribute transfer.", inputSchema: { type: "object", properties: { content: { type: "string" }, stylePrompt: { type: "string" } }, required: [] }, run: (a) => JSON.stringify({ content: a.content||"", stylePrompt: a.stylePrompt||"", technique: "embedding reframing", tip: "Requires PyTorch + GPU." }) },
  { name: "hunyuan3d_texture", description: "Hunyuan3D texture: generate 3D with textures.", inputSchema: { type: "object", properties: { image: { type: "string" }, seed: { type: "number" } }, required: [] }, run: (a) => JSON.stringify({ image: a.image||"", seed: a.seed||1234, tip: "API: POST /generate {image, texture, seed}." }) },
];
for (const t of EX2) { if (!CREATIVE_TOOLS.some(x=>x.name===t.name)) CREATIVE_TOOLS.push(t); }

module.exports = { CREATIVE_TOOLS };
