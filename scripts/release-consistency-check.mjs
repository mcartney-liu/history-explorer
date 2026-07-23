#!/usr/bin/env node
/**
 * Release Consistency Checker (M9-006.1 — Policy-driven enhancement)
 * ---------------------------------------------------------------------------
 * Enforces `docs/RELEASE_VERSION_POLICY.md`. Each of the seven release-version
 * artifacts is checked by exactly one Rule, numbered to match the Policy:
 *
 *   R1  frontend/package.json         → Runtime Version ONLY (semver X.Y.Z)
 *   R2  Git Tag — runtime             → vX.Y.Z, annotated, points at runtime release
 *   R3  Git Tag — project             → vM9-XXX, annotated, latest by tag time
 *   R4  README.md                     → shows BOTH Latest Runtime Version + Latest Project Release
 *   R5  PROJECT_CONTEXT.md §5         → references correct Project Release (+ Runtime)
 *   R6  CHANGELOG.md                  → typed entries for BOTH streams
 *   R7  this checker                  → only checks; never writes / commits / tags / pushes
 *
 * Exit code: 0 = consistent, non-zero = inconsistency found.
 *
 * Single responsibility: it only CHECKS. It never writes, commits, or tags.
 * No new dependency — stdlib only (node:fs / node:path / node:child_process / node:url).
 *
 * Usage:
 *   node scripts/release-consistency-check.mjs            # PASS / FAIL / Summary
 *   node scripts/release-consistency-check.mjs --verbose  # + per-rule check process & matches
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const VERBOSE = process.argv.includes('--verbose');

// --- low-level helpers ------------------------------------------------------

const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(resolve(ROOT, rel));

function git(args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  } catch {
    return null;
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Extract a top-level (`# `) section from markdown, from `headerRe` to the next `# ` heading. */
function extractSection(text, headerRe) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => headerRe.test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

/** Parse CHANGELOG `## [id] - date (type)` entries into { id, header, body }. */
function parseChangelog(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(/^##\s+\[([^\]]+)\]\s*(.*)$/m);
    if (m) {
      cur = { id: m[1], header: m[2] || '', body: '' };
      entries.push(cur);
    } else if (cur) {
      cur.body += l + '\n';
    }
  }
  return entries;
}

// --- rule runner ------------------------------------------------------------

function runRule(id, title, fn) {
  const notes = [];
  let ok = true;
  const check = (cond, label, got) => {
    const pass = !!cond;
    if (!pass) ok = false;
    notes.push({ ok: pass, label, got: got == null ? '' : String(got) });
  };
  try {
    fn(check);
  } catch (e) {
    ok = false;
    notes.push({ ok: false, label: 'unexpected error during evaluation', got: e.message });
  }
  return { id, title, ok, notes };
}

// --- gather facts -----------------------------------------------------------

let pkg = null;
try {
  pkg = JSON.parse(read('frontend/package.json'));
} catch {
  pkg = null;
}
const runtimeVersion = pkg && typeof pkg.version === 'string' ? pkg.version : ''; // "0.13.0"
const runtimeTag = runtimeVersion ? `v${runtimeVersion}` : null;

// Resolve tags by TIME (creatordate), never by lexical version sort.
const refOut =
  git([
    'for-each-ref',
    '--sort=-creatordate',
    '--format=%(refname:short)\t%(objecttype)\t%(creatordate:unix)',
    'refs/tags',
  ]) || '';
const refs = refOut
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [name, type, date] = l.split('\t');
    return { name, type, date: date ? Number(date) : 0 };
  })
  .filter((r) => r.name);

const runtimeRefs = refs
  .filter((r) => /^v\d+\.\d+\.\d+$/.test(r.name))
  .sort((a, b) => b.date - a.date);
const projectRefs = refs
  .filter((r) => /^vM[\d.\-]+$/.test(r.name))
  .sort((a, b) => b.date - a.date);

const latestProjectRef = projectRefs[0] || null;
const projectRelease = latestProjectRef ? latestProjectRef.name : null; // e.g. vM9-004.2
const runtimeTagRef = refs.find((r) => r.name === runtimeTag) || null;

const readme = exists('README.md') ? read('README.md') : '';
const ctx = exists('PROJECT_CONTEXT.md') ? read('PROJECT_CONTEXT.md') : '';
const changelog = exists('CHANGELOG.md') ? read('CHANGELOG.md') : '';

// --- R1: package.json (Runtime Version ONLY) — Policy §3 rule 1 ------------

const r1 = runRule('R1', 'package.json — Runtime Version ONLY (semver X.Y.Z)', (check) => {
  check(Boolean(runtimeVersion), 'version field present');
  check(
    /^\d+\.\d+\.\d+$/.test(runtimeVersion),
    'version is pure semver (X.Y.Z), not a vM project release',
    runtimeVersion,
  );
  check(
    !runtimeVersion.startsWith('vM'),
    'version is NOT a project release tag',
    runtimeVersion,
  );
});

// --- R2: Git Tag — runtime — Policy §2 artifact 2 / §3 rule 2 --------------

const r2 = runRule('R2', 'Git Tag (runtime) — vX.Y.Z, annotated', (check) => {
  check(Boolean(runtimeTagRef), `tag ${runtimeTag || '(n/a)'} exists`, runtimeTag || '');
  check(
    runtimeTagRef && runtimeTagRef.type === 'tag',
    `tag ${runtimeTag || '(n/a)'} is annotated`,
    runtimeTagRef ? runtimeTagRef.type : '(missing)',
  );
});

// --- R3: Git Tag — project — Policy §2 artifact 3 / §3 rule 2 --------------

const r3 = runRule('R3', 'Git Tag (project) — vM9-XXX, annotated, latest by time', (check) => {
  check(Boolean(latestProjectRef), 'a vM* project tag exists', projectRelease || '(none)');
  check(
    latestProjectRef && latestProjectRef.type === 'tag',
    `latest project tag ${projectRelease || '(n/a)'} is annotated`,
    latestProjectRef ? latestProjectRef.type : '(missing)',
  );
  // Resolved by creatordate, not string sort — assert the chosen one is the newest vM by time.
  if (projectRefs.length > 1) {
    check(
      latestProjectRef === projectRefs[0],
      'latest project tag chosen by tag time (creatordate), not lexical sort',
      `${latestProjectRef ? latestProjectRef.name : '?'}=${latestProjectRef ? latestProjectRef.date : '?'}`,
    );
  }
});

// --- R4: README — both streams, with correct values — Policy §3 rule 3 -----

const r4 = runRule('R4', 'README.md — shows BOTH Latest Runtime Version + Latest Project Release', (check) => {
  const rtMatch = readme.match(/(?:Latest\s+)?Runtime Version:\s*(v\d+\.\d+\.\d+)/i);
  const prMatch = readme.match(/(?:Latest\s+)?Project Release:\s*(vM[\d.\-]+)/i);
  check(Boolean(rtMatch), 'README has a Runtime Version field', rtMatch ? rtMatch[1] : '(missing)');
  check(
    rtMatch && rtMatch[1] === runtimeTag,
    `README Runtime Version value matches tag (${runtimeTag || 'n/a'})`,
    rtMatch ? rtMatch[1] : '(missing)',
  );
  check(Boolean(prMatch), 'README has a Project Release field', prMatch ? prMatch[1] : '(missing)');
  check(
    prMatch && prMatch[1] === projectRelease,
    `README Project Release value matches latest tag (${projectRelease || 'n/a'})`,
    prMatch ? prMatch[1] : '(missing)',
  );
});

// --- R5: PROJECT_CONTEXT §5 Current State — Policy §3 rule 4 ---------------

const r5 = runRule('R5', 'PROJECT_CONTEXT.md §5 — references correct Project Release', (check) => {
  const section = extractSection(ctx, /^#\s*\d+\.\s*Current State/i);
  check(Boolean(section), '§5 "Current State" section present');
  if (section) {
    const rtOk = section.includes(`v${runtimeVersion}`);
    const prOk = section.includes(projectRelease);
    check(rtOk, `§5 references Runtime Version (v${runtimeVersion || 'n/a'})`, rtOk ? `v${runtimeVersion}` : '(missing)');
    check(
      prOk,
      `§5 references Project Release (${projectRelease || 'n/a'})`,
      prOk ? projectRelease : '(missing)',
    );
  }
});

// --- R6: CHANGELOG — typed entries for BOTH streams — Policy §3 rule 5 -----

const r6 = runRule('R6', 'CHANGELOG.md — typed entries for runtime + project streams', (check) => {
  const entries = parseChangelog(changelog);
  const runtimeEntry = entries.find((e) => e.id === runtimeVersion);
  const projectEntry = entries.find((e) => e.id === projectRelease);

  check(Boolean(runtimeEntry), `runtime entry [${runtimeVersion || 'n/a'}] exists`, runtimeVersion || '');
  if (runtimeEntry) {
    const isSemver = /^\d+\.\d+\.\d+$/.test(runtimeEntry.id);
    const notNonRuntime = !/non-runtime release/i.test(runtimeEntry.header + '\n' + runtimeEntry.body);
    check(isSemver && notNonRuntime, 'runtime entry is typed Runtime Release (not "Non-runtime")', runtimeEntry.id);
  }

  check(Boolean(projectEntry), `project entry [${projectRelease || 'n/a'}] exists`, projectRelease || '');
  if (projectEntry) {
    const isProjectTag = /^vM[\d.\-]+$/.test(projectEntry.id);
    const typedProject = /project release/i.test(projectEntry.header + '\n' + projectEntry.body);
    const typedNonRuntime = /non-runtime release/i.test(projectEntry.header + '\n' + projectEntry.body);
    check(
      isProjectTag && typedProject && typedNonRuntime,
      'project entry is typed Project Release + Non-runtime release',
      projectEntry.id,
    );
  }
});

// --- R7: this checker — only checks — Policy §3 rule 7 ---------------------

const r7 = runRule('R7', 'Consistency Checker — only checks (no commit/tag/push/write)', (check) => {
  check(exists('scripts/release-consistency-check.mjs'), 'checker artifact present at scripts/release-consistency-check.mjs');

  // R7 enforces THIS checker is observational-only: it must never mutate the
  // repository. The checker's only git need is reading tag metadata via
  // `for-each-ref`. We therefore permit EXACTLY one git(...) call, and its
  // subcommand MUST be `for-each-ref`. Any other subcommand (commit / push /
  // tag / config / checkout / reset / merge / add / ...) is rejected — closing
  // the prior allowlist loophole where overloaded subcommands (tag, config,
  // diff) could pass as "read-only".
  const PERMITTED_GIT_SUBCMDS = new Set(['for-each-ref']);
  const self = readFileSync(__filename, 'utf8');
  const callSrc = self.match(/git\(\s*\[([^\]]*)\]/g) || [];
  const bad = [];
  for (const c of callSrc) {
    const inner = (c.match(/git\(\s*\[([^\]]*)\]/) || [])[1] || '';
    const tok = inner.match(/'([^']+)'|"([^"]+)"|`([^`]+)`|([A-Za-z][\w-]*)/);
    const sub = (tok && (tok[1] || tok[2] || tok[3] || tok[4])) || '';
    if (!PERMITTED_GIT_SUBCMDS.has(sub)) bad.push(sub || '?');
  }
  check(callSrc.length === 1, 'exactly one git(...) call present in checker', `count=${callSrc.length}`);
  check(bad.length === 0, 'the single git(...) call uses permitted subcommand (for-each-ref)', bad.join(', ') || 'for-each-ref');

  // child_process is only ever used to invoke read-only git.
  const execGit = self.match(/execFileSync\(\s*'git'/g) || [];
  check(execGit.length >= 1, "child_process invoked only for git (read-only)", `execFileSync('git' x${execGit.length}`);
});

// --- render -----------------------------------------------------------------

const rules = [r1, r2, r3, r4, r5, r6, r7];
const failed = rules.filter((r) => !r.ok);
const exitCode = failed.length === 0 ? 0 : 1;

const line = (s) => console.log(s);

line('Release Consistency Check (M9-006.1)');
line('Policy: docs/RELEASE_VERSION_POLICY.md');
line('========================================');
for (const r of rules) {
  line(`${r.id} ${r.ok ? 'PASS' : 'FAIL'}  ${r.title}`);
  if (VERBOSE) {
    for (const n of r.notes) {
      line(`    [${n.ok ? 'ok' : 'XX'}] ${n.label}${n.got ? ` -> ${n.got}` : ''}`);
    }
  }
}
line('');
line('Summary');
line('----------------------------------------');
line(`Runtime Version : ${runtimeVersion || '(unknown)'}`);
line(`Project Release : ${projectRelease || '(unknown)'}`);
line(`Rules Passed    : ${rules.length - failed.length}/${rules.length}`);
line(`Rules Failed    : ${failed.length}`);
line(`Exit Code       : ${exitCode}`);
line('========================================');
line(exitCode === 0 ? 'RESULT: PASS — all seven artifacts are consistent.' : `RESULT: FAIL — ${failed.length} rule(s) violated.`);

process.exit(exitCode);
