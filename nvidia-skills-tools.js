'use strict';
// ─── NVIDIA skills tools ──────────────────────────────────────────────────────
// Exposes the curated NVIDIA/skills catalog (48 entries) as callable MCP tools.
//
// Two surfaces:
//   nvidia_skills  - whole manifest (or one skill's full SKILL.md body)
//   skills_search  - keyword + category filter over the manifest
//
// The manifest (skills/nvidia-skills.json) is the allow-list: only ids listed
// there may be read from disk. The SKILL.md bodies are NOT vendored into this
// repo -- they live in the local skill catalog and are read at call time from
// SHADDAI_NVIDIA_SKILLS_ROOT (default: ~/.agents/skills).
//
// Path safety: skill ids are matched against a strict charset, and the
// resolved SKILL.md path must sit directly inside the catalog root. Anything
// else (e.g. "../../etc/passwd") is rejected before any filesystem access.
//
// Output budget: the unified server truncates every tool result at 12000
// chars, so this module is budget-aware. When `maxChars` is finite it
//   - renders the manifest as a compact one-line-per-skill index, and
//   - splits a long SKILL.md into numbered parts (`part` / `totalParts`),
// so no caller ever silently receives half a document.
const fs = require('fs');
const os = require('os');
const path = require('path');

const ragIndex = require('./rag-index');

const NVIDIA_SKILL_CATEGORIES = ['omniverse', 'physical-ai', 'cosmos', 'climate', 'rag', 'vision', 'tao', 'data', 'meta'];
const SAFE_SKILL_ID = /^[a-z0-9][a-z0-9._-]*$/;

// Unified server hard-copies tool output to 12000 chars.
const UNIFIED_MAX_CHARS = 11000;

function skillsRoot() {
  return path.resolve(
    process.env.SHADDAI_NVIDIA_SKILLS_ROOT || path.join(os.homedir(), '.agents', 'skills')
  );
}

/**
 * Resolve a skill id to a SKILL.md path inside the catalog root.
 * Returns null when the id is malformed or the resolved path escapes the root.
 */
function nvidiaSkillFile(id) {
  if (!SAFE_SKILL_ID.test(String(id || ''))) return null;
  const root = skillsRoot();
  const file = path.resolve(root, String(id), 'SKILL.md');
  // Defense in depth: the resolved file must sit directly inside <root>/<id>/.
  if (path.dirname(file) !== path.join(root, String(id))) return null;
  if (!file.startsWith(root + path.sep)) return null;
  return file;
}

function allSkills() {
  return ragIndex.listNvidiaSkills();
}

function manifestIndexText(skills, maxChars) {
  const gpu = skills.filter((s) => s.requiresGpu).length;
  const header = [
    `NVIDIA skills catalog - ${skills.length} curated entries from NVIDIA/skills.`,
    `GPU: ${gpu} require an NVIDIA GPU, ${skills.length - gpu} run CPU-only.`,
    'Full entries (description, gpuReason, SAP relevance): nvidia_skills { category, limit }.',
    'Full SKILL.md body: nvidia_skills { skill, part }.',
    '',
  ].join('\n');

  const line = (s, w) =>
    `[${s.id}] ${s.category} | GPU:${s.requiresGpu ? 'Y' : 'N'}` +
    (s.version ? ` | v${s.version}` : '') +
    (s.description ? ` | ${s.description.slice(0, w)}` : '');

  for (const w of [150, 130, 110, 90, 70, 50, 30, 0]) {
    const body = skills.map((s) => line(s, w)).join('\n');
    if (header.length + body.length + 2 <= maxChars) return header + body;
  }
  // Last resort: ids only.
  return header + skills.map((s) => `[${s.id}] ${s.category} GPU:${s.requiresGpu ? 'Y' : 'N'}`).join('\n');
}

/**
 * The full manifest, or one skill's metadata + SKILL.md body.
 * Returns { ok: true, text } or { ok: false, error }.
 */
function nvidiaSkills(a, opts) {
  const args = a || {};
  const options = opts || {};
  const maxChars = Number.isFinite(options.maxChars) ? options.maxChars : Infinity;

  const skills = allSkills();
  if (!skills.length) {
    return { ok: false, error: 'NVIDIA skills manifest not loaded. Expected skills/nvidia-skills.json in the MCP repo.' };
  }

  const skillId = args.skill ? String(args.skill).trim() : '';
  if (!skillId) {
    // ── manifest mode ──
    const category = args.category ? String(args.category) : null;
    if (category && !NVIDIA_SKILL_CATEGORIES.includes(category)) {
      return { ok: false, error: `Unknown category "${category}". Valid: ${NVIDIA_SKILL_CATEGORIES.join(', ')}` };
    }
    let list = category ? skills.filter((s) => s.category === category) : skills;
    const limit = Number(args.limit) || 0;
    if (limit > 0) list = list.slice(0, limit);

    const full = JSON.stringify(list, null, 2);
    if (full.length <= maxChars) return { ok: true, text: full };
    return { ok: true, text: manifestIndexText(list, maxChars) };
  }

  // ── single-skill mode ──
  const entry = ragIndex.getNvidiaSkill(skillId);
  if (!entry) {
    return {
      ok: false,
      error:
        `Unknown NVIDIA skill "${skillId}".\n` +
        `Valid ids: ${skills.map((s) => s.id).join(', ')}\n` +
        'Call nvidia_skills with no arguments to get the full manifest.',
    };
  }
  const file = nvidiaSkillFile(entry.id);
  if (!file) return { ok: false, error: `Could not resolve a safe SKILL.md path for "${entry.id}".` };

  let body;
  try {
    body = fs.readFileSync(file, 'utf8');
  } catch (e) {
    return { ok: false, error: `Could not read SKILL.md for "${entry.id}" at ${file}: ${(e && e.message) || e}` };
  }

  const meta = JSON.stringify({ ...entry, skillFile: file }, null, 2);

  if (!Number.isFinite(maxChars)) {
    return { ok: true, text: meta + '\n\n' + body };
  }

  // Budgeted: split the body into parts so nothing is silently truncated.
  const reserve = meta.length + 320;
  const chunkSize = Math.max(2000, maxChars - reserve);
  const totalParts = Math.max(1, Math.ceil(body.length / chunkSize));
  const requested = Number(args.part) || 1;
  const part = Math.min(Math.max(1, requested), totalParts);
  const start = (part - 1) * chunkSize;
  const chunk = body.slice(start, start + chunkSize);

  const head =
    `SKILL.md part ${part} of ${totalParts} for "${entry.id}"` +
    (totalParts > 1 ? ` (call nvidia_skills { skill: "${entry.id}", part: ${part + 1} } for more)` : '') +
    '\n\n';
  return { ok: true, text: meta + '\n\n' + head + chunk };
}

/**
 * Keyword + category filter over the manifest.
 * Returns { ok: true, text } or { ok: false, error }.
 */
function skillsSearch(a) {
  const args = a || {};
  const query = String(args.query || '').trim();
  if (!query) return { ok: false, error: 'query is required.' };
  const category = args.category ? String(args.category) : null;
  if (category && !NVIDIA_SKILL_CATEGORIES.includes(category)) {
    return { ok: false, error: `Unknown category "${category}". Valid: ${NVIDIA_SKILL_CATEGORIES.join(', ')}` };
  }
  const hits = ragIndex.searchNvidiaSkills(query, {
    category: category || null,
    limit: Math.min(Number(args.limit) || 10, 48),
  });
  return {
    ok: true,
    text: JSON.stringify({ query, category: category || null, count: hits.length, skills: hits }, null, 2),
  };
}

const ALL_NVIDIA_TOOLS = [
  {
    name: 'nvidia_skills',
    description:
      'List the curated NVIDIA skills catalog (48 entries with id, description, category, GPU requirement, and S.A.P. relevance) or fetch one skill\'s full SKILL.md body. Call with no arguments for the manifest; { skill: "<id>" } for one skill; { category, limit } to page full entries; { skill, part } to page a long body.',
    inputSchema: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          description: 'Skill id to fetch, e.g. "rag-blueprint". Omit to get the catalog.',
        },
        category: {
          type: 'string',
          enum: NVIDIA_SKILL_CATEGORIES,
          description: 'Optional category filter for catalog mode.',
        },
        limit: { type: 'number', minimum: 1, maximum: 48, description: 'Max entries in catalog mode.' },
        part: { type: 'number', minimum: 1, maximum: 8, description: 'Which part of a long SKILL.md body.' },
      },
      required: [],
    },
    run: (a) => {
      const r = nvidiaSkills(a, { maxChars: UNIFIED_MAX_CHARS });
      return r.ok ? r.text : 'Error: ' + r.error;
    },
  },
  {
    name: 'skills_search',
    description:
      'Filter the NVIDIA skills catalog by keyword over id, name, description, category, and S.A.P. relevance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords to match against the skill manifest' },
        category: {
          type: 'string',
          enum: NVIDIA_SKILL_CATEGORIES,
          description: 'Optional category filter',
        },
        limit: { type: 'number', minimum: 1, maximum: 48, description: 'Max skills to return (default 10)' },
      },
      required: ['query'],
    },
    run: (a) => {
      const r = skillsSearch(a);
      return r.ok ? r.text : 'Error: ' + r.error;
    },
  },
];

module.exports = {
  ALL_NVIDIA_TOOLS,
  NVIDIA_SKILL_CATEGORIES,
  UNIFIED_MAX_CHARS,
  nvidiaSkills,
  skillsSearch,
  nvidiaSkillFile,
  skillsRoot,
};
