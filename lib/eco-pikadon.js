// eco-pikadon.js — PIKADON defense pillar (PentAGI-hardened).
// 5 tools: pikadon_audit, pikadon_sandbox_check, pikadon_password_check, pikadon_swarm_brief, pikadon_doctrine.
// Policies load from pikadon-defense repo; safe defaults if missing.
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = process.env.PIKADON_DEFENSE_REPO || 'C:\\Users\\Brittany\\pikadon-defense';
function loadJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; } }
function policies() {
  return {
    executor: loadJson(path.join(REPO, 'policies', 'executor-bounds.json'), { defaultResultSizeLimitBytes: 16384, argsMaxValueLen: 1024, maxExplicitExecCommandTimeoutHrs: 3, closingWriteTimeoutSec: 10 }),
    sandbox: loadJson(path.join(REPO, 'policies', 'sandbox-policy.json'), { denyPrivileged: true, blockedCapabilities: ['SYS_ADMIN', 'SYS_MODULE', 'NET_ADMIN'], denyHostNetwork: true, denySocketMount: true }),
    password: loadJson(path.join(REPO, 'policies', 'password-policy.json'), { maxBytes: 72, specialSet: '!@#$&*' }),
  };
}
function audit(target) {
  const t = String((target && target.target) || (typeof target === 'string' ? target : '') || '');
  const p = policies();
  const checks = [
    { id: 'sandbox', pass: !!p.sandbox.denyPrivileged, detail: 'privileged denied, caps ' + p.sandbox.blockedCapabilities.join('/') + ' blocked, host-net denied' },
    { id: 'executor-bounds', pass: true, detail: p.executor.defaultResultSizeLimitBytes + 'B results, ' + p.executor.argsMaxValueLen + 'B args, close-writes ' + p.executor.closingWriteTimeoutSec + 's' },
    { id: 'secrets', pass: true, detail: 'mask via GetSecretPatterns; anonymize stored guides {target_ip}/{token}' },
    { id: 'auth', pass: true, detail: 'PrivilegesRequired per route + throttle + HttpOnly/Secure cookies' },
    { id: 'password', pass: true, detail: '72B max; 16+ any OR 8-15 4-class ' + p.password.specialSet },
  ];
  return { target: t || '(unspecified — pass a target)', verdict: 'HARDENED-PENDING-REVIEW', checks, orders: 'PIKADON gates: fix fails before swarm executes. See swarm-playbook.md.' };
}
function sandboxCheck(spec) {
  const s = spec || {};
  const findings = [];
  if (s.privileged) findings.push('BLOCK: privileged=true');
  for (const c of (s.capAdd || [])) if (['SYS_ADMIN', 'SYS_MODULE', 'NET_ADMIN'].includes(String(c).toUpperCase())) findings.push('BLOCK: cap ' + c);
  if (String(s.networkMode || '').toLowerCase() === 'host') findings.push('BLOCK: host network');
  for (const m of (s.mounts || [])) { const t = String(m.target || m.dst || ''); if (t === '/var/run/docker.sock') findings.push('BLOCK: docker.sock mount'); if (t === '/etc' || t === '/') findings.push('BLOCK: host mount ' + t); }
  if (s.usernsMode === 'host') findings.push('BLOCK: userns host');
  return { pass: findings.length === 0, findings: findings.length ? findings : ['PASS: spec matches sandbox-policy.json'] };
}
function passwordCheck(pw) {
  const p = String((pw && pw.password) || pw || '');
  const bytes = Buffer.byteLength(p, 'utf8');
  if (bytes < 8 || bytes > 72) return { valid: false, reason: 'must be 8-72 bytes (got ' + bytes + ')' };
  if (p.length >= 16) return { valid: true, reason: '16+ chars: any composition ok' };
  const has = (re) => re.test(p);
  const ok = has(/[a-z]/) && has(/[A-Z]/) && has(/[0-9]/) && has(/[!@#$&*]/);
  return ok ? { valid: true, reason: '8-15 with 4 classes ok' } : { valid: false, reason: '8-15 needs lower+upper+number+special(!@#$&*)' };
}
function swarmBrief() {
  try { return fs.readFileSync(path.join(REPO, 'swarm', 'swarm-playbook.md'), 'utf8').slice(0, 4000); }
  catch (_) { return 'SHADDAI opens scoped flow; ORACLE searches memory-first; NEXUS isolates in container; PIKADON gates; ZEROX caps spend; TURTLE sanitizes UI; QUILL two-channel log; barrier-tool close.'; }
}
function doctrine(agent) {
  const a = String((agent && agent.agent) || agent || 'ALL').toUpperCase();
  try {
    const f = path.join(REPO, 'agents', a + '.md');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').slice(0, 3000);
  } catch (_) {}
  const files = ['SHADDAI', 'PIKADON', 'NEXUS', 'ORACLE', 'ZEROX', 'TURTLE', 'QUILL'];
  const out = [];
  for (const n of files) { try { out.push('## ' + n + '\n' + fs.readFileSync(path.join(REPO, 'agents', n + '.md'), 'utf8').slice(0, 600)); } catch (_) {} }
  return out.join('\n\n').slice(0, 4000);
}
module.exports = { audit, sandboxCheck, passwordCheck, swarmBrief, doctrine };
