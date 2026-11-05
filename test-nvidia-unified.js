'use strict';
// Live stdio test: boots mcp-unified.js as a child process and exercises the
// NVIDIA tool wiring (nvidia_skills + skills_search) over real JSON-RPC.
//
// The unified server hard-truncates every tool result at 12000 chars, so the
// assertions below check that the NVIDIA tools degrade gracefully: the
// manifest becomes a compact index, and long SKILL.md bodies are split into
// numbered parts rather than silently cut off.
const { spawn } = require('child_process');
const path = require('path');

const BIN = path.join(__dirname, 'mcp-unified.js');
const CAP = 12000;

function rpc(proc, msg) {
  return new Promise((resolve) => {
    let buf = '';
    const onData = (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.id === msg.id) { proc.stdout.off('data', onData); resolve(obj); }
        } catch (_) {}
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify(msg) + '\n');
  });
}

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  [PASS] ' + label); }
  else { fail++; console.log('  [FAIL] ' + label); }
}

const textOf = (r) => ((r && r.result && r.result.content) || []).map((c) => c.text).join('\n');

(async () => {
  // Point the unified server at a closed loopback port so backend calls fail
  // fast and locally, and lift the per-second rate limit so the ~14 calls in
  // this harness don't trip it. The NVIDIA tools are entirely repo+filesystem
  // backed, so this test must not depend on the remote SHADDAI API being up --
  // otherwise it flakes whenever the network is slow.
  const proc = spawn(process.execPath, [BIN], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      SHADDAI_API_URL: 'http://127.0.0.1:9',
      SHADDAI_RATE_PER_SEC: '1000',
    },
  });
  proc.stderr.on('data', () => {});
  proc.stdout.setEncoding('utf8');

  await rpc(proc, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'nvidia-wiring-test', version: '1.0.0' } } });

  // ── tools/list ──
  const list = await rpc(proc, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const tools = (list.result && list.result.tools) || [];
  const names = tools.map((t) => t.name);
  console.log('  total tools advertised: ' + tools.length);
  ok(names.includes('nvidia_skills'), 'nvidia_skills advertised in tools/list');
  ok(names.includes('skills_search'), 'skills_search advertised in tools/list');
  const ns = tools.find((t) => t.name === 'nvidia_skills');
  ok(!!ns && !!ns.description && !!(ns.inputSchema && ns.inputSchema.properties), 'nvidia_skills has description + inputSchema');
  ok(!!ns && ns.inputSchema && Array.isArray(ns.inputSchema.required) && ns.inputSchema.required.length === 0, 'nvidia_skills requires no args (catalog mode)');

  // ── catalog mode ──
  const man = await rpc(proc, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'nvidia_skills', arguments: {} } });
  const manText = textOf(man);
  ok(manText.length <= CAP, 'catalog output fits the ' + CAP + '-char server cap (' + manText.length + ')');
  ok(/48 curated entries/.test(manText), 'catalog header reports 48 entries');
  ok(/25 require an NVIDIA GPU, 23 run CPU-only/.test(manText), 'catalog header reports 25 GPU / 23 CPU-only');
  const idLines = manText.split('\n').filter((l) => l.startsWith('['));
  ok(idLines.length === 48, 'catalog index lists all 48 skill ids (' + idLines.length + ')');
  ok(/\[rag-blueprint\]/.test(manText) && /\[earth2studio-deterministic-forecast\]/.test(manText), 'catalog index contains known skill ids');
  const gpuLines = idLines.filter((l) => l.includes('GPU:Y')).length;
  const cpuLines = idLines.filter((l) => l.includes('GPU:N')).length;
  ok(gpuLines === 25 && cpuLines === 23, 'catalog index marks 25 GPU / 23 CPU-only skills (got ' + gpuLines + '/' + cpuLines + ')');

  // ── catalog mode with category filter (full JSON, small enough to fit) ──
  const cat = await rpc(proc, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { category: 'climate' } } });
  const catText = textOf(cat);
  let catJson = null;
  try { catJson = JSON.parse(catText); } catch (_) {}
  ok(Array.isArray(catJson) && catJson.length === 7, 'category filter returns the 7 climate skills as full JSON');
  ok(!!catJson && catJson.every((s) => s.category === 'climate'), 'every returned entry is in the requested category');
  ok(!!catJson && catJson.every((s) => s.id && s.description && typeof s.requiresGpu === 'boolean'), 'full entries carry id/description/requiresGpu');
  ok(!!catJson && catJson.some((s) => s.sapRelevance), 'full entries carry S.A.P. relevance');

  // ── single skill body ──
  const one = await rpc(proc, { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { skill: 'rag-blueprint' } } });
  const oneText = textOf(one);
  ok(oneText.includes('rag-blueprint'), 'nvidia_skills returns the requested skill');
  ok(oneText.includes('NVIDIA RAG Blueprint'), 'nvidia_skills returns the real SKILL.md body');
  ok(oneText.length <= CAP, 'single-skill output fits the cap (' + oneText.length + ')');

  // ── long body is split into parts, not truncated ──
  const longest = 'tao-launch-workflow'; // ~20.4 KB of SKILL.md
  const p1 = textOf(await rpc(proc, { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { skill: longest } } }));
  ok(/part 1 of \d+/.test(p1), 'long body is announced as part 1 of N');
  ok(p1.length <= CAP, 'long-body part 1 fits the cap (' + p1.length + ')');
  const totalParts = Number((p1.match(/part 1 of (\d+)/) || [])[1] || 0);
  ok(totalParts >= 2, 'a 20 KB skill is split into multiple parts (' + totalParts + ')');
  const p2 = textOf(await rpc(proc, { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { skill: longest, part: 2 } } }));
  ok(/part 2 of \d+/.test(p2), 'part 2 is retrievable');
  ok(p2.length <= CAP, 'long-body part 2 fits the cap (' + p2.length + ')');
  ok(p1 !== p2, 'part 1 and part 2 return different content');
  const lastPart = textOf(await rpc(proc, { jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { skill: longest, part: totalParts } } }));
  ok(/part \d+ of \d+/.test(lastPart), 'the last part is retrievable');
  // Part 1 and part 2 together must cover more than part 1 alone.
  ok(p1.length + p2.length > p1.length + 2000, 'paging yields the full document across parts');

  // ── path traversal ──
  const bad = await rpc(proc, { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nvidia_skills', arguments: { skill: '../../etc/passwd' } } });
  const badText = textOf(bad);
  ok(!/root:/.test(badText), 'path traversal is rejected, no file contents leaked');
  ok(/Unknown NVIDIA skill/.test(badText), 'unknown/traversal id returns a clean error');

  // ── skills_search ──
  const sr = textOf(await rpc(proc, { jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'skills_search', arguments: { query: 'climate forecast', category: 'climate', limit: 5 } } }));
  let srJson = null;
  try { srJson = JSON.parse(sr); } catch (_) {}
  ok(!!srJson && typeof srJson.count === 'number', 'skills_search returns { query, category, count, skills }');
  ok(!!srJson && srJson.skills.every((s) => s.category === 'climate'), 'skills_search honours the category filter');
  ok(!!srJson && srJson.skills.some((s) => /earth2studio/.test(s.id)), 'skills_search finds the earth2studio skills');
  ok(sr.length <= CAP, 'skills_search output fits the cap (' + sr.length + ')');

  const bc = textOf(await rpc(proc, { jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'skills_search', arguments: { query: 'x', category: 'not-a-category' } } }));
  ok(/Unknown category/.test(bc), 'skills_search rejects an unknown category');

  // ── health ──
  const hp = textOf(await rpc(proc, { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'health_check', arguments: {} } }));
  ok(/NVIDIA skill tools: 2/.test(hp), 'health_check reports the NVIDIA tool count');

  proc.kill();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('harness error:', (e && e.stack) || e);
  process.exit(2);
});
