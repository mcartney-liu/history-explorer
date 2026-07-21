#!/usr/bin/env node
// History Explorer — M3.5 Freeze Guard
//
// Automated protection for the M3.5-000 Schema Freeze + Team Operating Spec
// v1.2 invariant: no AI / LLM / graph-DB / Redis / new dependency / backend
// schema changes enter through the frontend-only milestones.
//
// Design (from M8.6-003 Design Freeze):
//   - Token scan first strips ALL comments (//, #, /* */, """ docstrings),
//     string/template literals, then scans only real code logic. This keeps
//     the documented "AI is a future capability" notes (which are LEGAL)
//     from false-FAILing. Only genuine code-logic hits are D-class.
//   - Token list is intentionally narrow: gpt | openai | rag | neo4j |
//     graphql | redis. These are strong signals of an AI/LLM/graph/Redis
//     RUNTIME being introduced. The bare words `ai`/`llm` are deliberately
//     EXCLUDED: they are product-concept words that legally appear in docs,
//     UI copy, and tests (e.g. "AI is a future capability"). Runtime
//     introduction is caught via dependency + path-scope checks instead.
//     (recommend/ranking/similarity/confidence/importance/influence) are
//     LEGAL (TimeValue fields, the `influenced` relationship type, search
//     ordering) and are guarded indirectly via the dependency + path-scope
//     checks instead of text bans, to avoid false-FAILs.
//   - Forbidden dependencies are scanned in package.json + requirements*.txt.
//   - Path scope (FROZEN_SCOPE=frontend) blocks backend/app changes.
//   - Enum guard re-asserts ENTITY_TYPES=8 / RELATIONSHIP_TYPES=18.
//
// Severity model (M8.6 Playbook): only D-class (business-logic) hits FAIL.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FROZEN_SCOPE = process.env.FROZEN_SCOPE || "frontend";

// ---- Configuration (adjust per milestone; keep in sync with M3.5-000) ----
// Narrow, high-signal token set (see header note for why business words are
// intentionally excluded).
const FORBIDDEN_TOKENS =
  /\b(gpt|openai|rag|neo4j|graphql|redis)\b/i;
const FORBIDDEN_DEPS =
  /(openai|langchain|anthropic|cohere|neo4j|redis|tensorflow|torch|pytorch|huggingface|spacy|nltk|scikit-learn|sklearn)/i;
const EXPECTED_ENTITY_TYPES = 8;
const EXPECTED_RELATIONSHIP_TYPES = 18;
const SCAN_DIRS = ["frontend/src", "backend/app"];

// D-class violations -> zero tolerance -> process.exit(1)
const D = [];

function log(msg) {
  process.stderr.write(msg + "\n");
}

// ---- changed files (for scope check) ----
function getChangedFiles() {
  const tryDiff = (base) => {
    try {
      const out = execSync(`git diff --name-only ${base}...HEAD`, {
        cwd: ROOT,
      })
        .toString()
        .trim();
      return out ? out.split("\n").filter(Boolean) : null;
    } catch {
      return null;
    }
  };
  let files = null;
  if (process.env.GITHUB_BASE_REF) files = tryDiff(process.env.GITHUB_BASE_REF);
  if (!files) files = tryDiff("master");
  if (!files) {
    const st = execSync("git status --porcelain", { cwd: ROOT })
      .toString()
      .trim();
    files = st
      ? st.split("\n").filter(Boolean).map((l) => l.replace(/^[\w\W]{3}/, "").trim())
      : [];
  }
  return files;
}

// ---- 1. scope check ----
function checkScope(changed) {
  if (FROZEN_SCOPE !== "frontend") return;
  for (const f of changed) {
    if (
      f.startsWith("backend/") &&
      !f.startsWith("backend/tests/") &&
      !f.startsWith("backend/requirements")
    ) {
      D.push(
        `SCOPE: backend change outside tests/deps not allowed under FROZEN_SCOPE=frontend -> ${f}`
      );
    }
  }
}

// ---- 2. token check (strip comments + strings, then scan logic) ----
function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, cb);
    else cb(p);
  }
}
function checkTokens() {
  const exts = new Set([".ts", ".tsx", ".py"]);
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, (file) => {
      if (!exts.has(path.extname(file))) return;
      const rel = path.relative(ROOT, file);
      let src = fs.readFileSync(file, "utf8");
      // Remove cross-line block constructs FIRST (replace content with spaces
      // but KEEP newlines so line numbers stay accurate).
      src = src.replace(/"""[\s\S]*?"""/g, (m) => m.replace(/[^\n]/g, " ")); // py docstrings
      src = src.replace(/'''[\s\S]*?'''/g, (m) => m.replace(/[^\n]/g, " ")); // py docstrings
      src = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")); // js block
      src.split("\n").forEach((raw, i) => {
        // strip line comments
        let code = raw.replace(/\/\/.*$/, "").replace(/#.*$/, "");
        // strip string + template literals (UI copy / docstrings never FAIL)
        code = code
          .replace(/"[^"]*"/g, "")
          .replace(/'[^']*'/g, "")
          .replace(/`[^`]*`/g, "");
        const m = code.match(FORBIDDEN_TOKENS);
        if (m) {
          D.push(`TOKEN: ${rel}:${i + 1} forbidden token "${m[0]}"`);
        }
      });
    });
  }
}

// ---- 3. dependency check ----
function checkDeps() {
  const pkgPath = path.join(ROOT, "frontend/package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const d of Object.keys(deps)) {
      if (FORBIDDEN_DEPS.test(d)) {
        D.push(`DEP: frontend/package.json contains forbidden dep "${d}"`);
      }
    }
  }
  for (const rf of ["backend/requirements.txt", "backend/requirements-dev.txt"]) {
    const p = path.join(ROOT, rf);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, "utf8")
      .split("\n")
      .forEach((l) => {
        const name = l.split(/[=<>~ ]/)[0].trim();
        if (name && FORBIDDEN_DEPS.test(name)) {
          D.push(`DEP: ${rf} contains forbidden dep "${name}"`);
        }
      });
  }
}

// ---- 4. enum guard ----
function checkEnums() {
  const vp = path.join(ROOT, "backend/app/validation.py");
  if (!fs.existsSync(vp)) return;
  const c = fs.readFileSync(vp, "utf8");
  const eB = c.match(
    /ENTITY_TYPES:\s*frozenset(?:\[[^\]]*\])?\s*=\s*frozenset\(\s*\{([\s\S]*?)\}/
  );
  const rB = c.match(
    /RELATIONSHIP_TYPES:\s*frozenset(?:\[[^\]]*\])?\s*=\s*frozenset\(\s*\{([\s\S]*?)\}/
  );
  const count = (b) =>
    b ? (b[1].match(/"[^"]+"|'[^']+'/g) || []).length : -1;
  const eC = count(eB);
  const rC = count(rB);
  if (eC !== EXPECTED_ENTITY_TYPES)
    D.push(`ENUM: ENTITY_TYPES count=${eC} expected=${EXPECTED_ENTITY_TYPES}`);
  if (rC !== EXPECTED_RELATIONSHIP_TYPES)
    D.push(
      `ENUM: RELATIONSHIP_TYPES count=${rC} expected=${EXPECTED_RELATIONSHIP_TYPES}`
    );
}

// ---- run ----
const changed = getChangedFiles();
checkScope(changed);
checkTokens();
checkDeps();
checkEnums();

if (D.length) {
  log(`\n[M3.5 Freeze Guard] FAILED — ${D.length} D-class violation(s):`);
  for (const v of D) log("  - " + v);
  log("\nFix the violation or escalate to Product Owner before merge.");
  process.exit(1);
}
log("[M3.5 Freeze Guard] PASSED — no D-class violations.");
process.exit(0);
