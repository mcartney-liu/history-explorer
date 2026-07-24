#!/usr/bin/env node
// History Explorer — M3.5 Freeze Guard (+ M11 ADR-0003 controlled AI allowance)
//
// Automated protection for the M3.5-000 Schema Freeze + Team Operating Spec
// v1.2 invariant: no AI / LLM / graph-DB / Redis / new dependency / backend
// schema changes enter through the frontend-only milestones — EXCEPT the
// approved M11 AI Gateway, which passed the Freeze Revision Gate (ADR-0003).
//
// Design (from M8.6-003 Design Freeze):
//   - Token scan first strips ALL comments (//, #, /* */, """ docstrings),
//     string/template literals, then scans only real code logic. This keeps
//     the documented "AI is a future capability" notes (which are LEGAL)
//     from false-FAILing. Only genuine code-logic hits are D-class.
//   - The bare words `ai`/`llm` are deliberately EXCLUDED: they are product-concept
//     words that legally appear in docs, UI copy, and tests. Runtime introduction
//     is caught via dependency + path-scope checks instead.
//
// M11 (ADR-0003) evolution:
//   - AI runtime is permitted ONLY inside `backend/app/ai_gateway/` (the approved
//     module), behind an approved provider abstraction, with grounding required.
//   - A single approved LLM provider SDK is whitelisted (currently `openai`).
//     Any OTHER AI/LLM/vector SDK is still forbidden (unknown AI dependency FAILs).
//   - Outside the approved module, the absolute AI prohibition is unchanged.
//   - Vector DB / RAG / Neo4j / Redis / GIS remain forbidden everywhere.
//
// Severity model (M8.6 Playbook): only D-class (business-logic) hits FAIL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FROZEN_SCOPE = process.env.FROZEN_SCOPE || "frontend";

// ---- M11 (ADR-0003) approved AI allowance --------------------------------
// AI runtime is permitted ONLY inside this module, additive and grounded.
const APPROVED_AI_MODULE = "backend/app/ai_gateway/";
// Single approved LLM provider SDK (whitelisted). Change ONLY via a new ADR + Gate.
const APPROVED_AI_DEPS = new Set(["openai"]);
// M11-2 (ADR-0003): the FastAPI composition root `backend/app/main.py` must mount
// the AI Gateway routers (/ai/explain, /ai/chat). This is the ONLY backend/app file
// (besides ai_gateway/) permitted under FROZEN_SCOPE=frontend. Allowed content is
// STRICTLY route mounting — no AI logic, no graph mutation, no business logic. Any
// other change to main.py requires a new Freeze Revision Gate. Reviewed under ADR-0003
// + the M11-2 Architecture Acceptance Review (verdict: CONDITIONAL PASS).
const APPROVED_AI_MAIN = "backend/app/main.py";

// Tokens forbidden everywhere EXCEPT inside the approved AI module.
const FORBIDDEN_TOKENS = /\b(gpt|openai|rag|neo4j|graphql|redis|vectordb)\b/i;
// Inside the approved AI module the provider SDK is allowed, but these stay forbidden.
const APPROVED_MODULE_TOKENS = /\b(rag|neo4j|graphql|redis|vectordb)\b/i;

// Known AI/LLM/vector SDKs. Any that match but are NOT in APPROVED_AI_DEPS FAIL.
const AI_SDK_PATTERN = /(openai|anthropic|cohere|langchain|huggingface|gemini|claude|llamaindex|ollama|mistral|bedrock|azure-ai|semantic-kernel|chromadb|pinecone|weaviate|qdrant|faiss|milvus)/i;
// Always-forbidden infrastructure (never allowed, even outside the AI module).
const FORBIDDEN_INFRA = /(neo4j|redis|graphql|tensorflow|torch|pytorch|spacy|nltk|scikit-learn|sklearn)/i;

const EXPECTED_ENTITY_TYPES = 8;
const EXPECTED_RELATIONSHIP_TYPES = 18;
const SCAN_DIRS = ["frontend/src", "backend/app"];

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
export function checkScope(violations, changed, scope = FROZEN_SCOPE) {
  if (scope !== "frontend") return;
  for (const f of changed) {
    if (
      f.startsWith("backend/") &&
      !f.startsWith("backend/tests/") &&
      !f.startsWith("backend/requirements") &&
      !f.startsWith(APPROVED_AI_MODULE) &&
      f !== APPROVED_AI_MAIN
    ) {
      violations.push(
        `SCOPE: backend change outside tests/deps/ai_gateway/main.py not allowed under FROZEN_SCOPE=frontend -> ${f}`
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

export function checkTokens(violations, root = ROOT) {
  const exts = new Set([".ts", ".tsx", ".py"]);
  for (const dir of SCAN_DIRS) {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, (file) => {
      if (!exts.has(path.extname(file))) return;
      const rel = path.relative(root, file).split(path.sep).join("/");
      const inApprovedAi = rel.startsWith(APPROVED_AI_MODULE);
      const tokenRe = inApprovedAi ? APPROVED_MODULE_TOKENS : FORBIDDEN_TOKENS;
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
        const m = code.match(tokenRe);
        if (m) {
          violations.push(
            `TOKEN: ${rel}:${i + 1} forbidden token "${m[0]}"${
              inApprovedAi ? " (inside approved AI module)" : ""
            }`
          );
        }
      });
    });
  }
}

// ---- 3. dependency check ----
export function checkDeps(violations, root = ROOT) {
  const pkgPath = path.join(root, "frontend/package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    for (const d of Object.keys(deps)) {
      if (AI_SDK_PATTERN.test(d) && !APPROVED_AI_DEPS.has(d.toLowerCase())) {
        violations.push(
          `DEP: frontend/package.json contains non-approved AI SDK "${d}" (approved: ${[
            ...APPROVED_AI_DEPS,
          ]})`
        );
      }
      if (FORBIDDEN_INFRA.test(d)) {
        violations.push(`DEP: frontend/package.json contains forbidden dependency "${d}"`);
      }
    }
  }
  for (const rf of ["backend/requirements.txt", "backend/requirements-dev.txt"]) {
    const p = path.join(root, rf);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, "utf8")
      .split("\n")
      .forEach((l) => {
        const name = l.split(/[=<>~ ]/)[0].trim();
        if (!name) return;
        if (AI_SDK_PATTERN.test(name) && !APPROVED_AI_DEPS.has(name.toLowerCase())) {
          violations.push(`DEP: ${rf} contains non-approved AI SDK "${name}"`);
        }
        if (FORBIDDEN_INFRA.test(name)) {
          violations.push(`DEP: ${rf} contains forbidden dependency "${name}"`);
        }
      });
  }
}

// ---- 4. enum guard ----
export function checkEnums(violations, root = ROOT) {
  const vp = path.join(root, "backend/app/validation.py");
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
    violations.push(`ENUM: ENTITY_TYPES count=${eC} expected=${EXPECTED_ENTITY_TYPES}`);
  if (rC !== EXPECTED_RELATIONSHIP_TYPES)
    violations.push(
      `ENUM: RELATIONSHIP_TYPES count=${rC} expected=${EXPECTED_RELATIONSHIP_TYPES}`
    );
}

// ---- orchestration (pure, testable) ----
export function runChecks(opts = {}) {
  const root = opts.root ?? ROOT;
  const scope = opts.scope ?? FROZEN_SCOPE;
  const files = opts.files ?? getChangedFiles();
  const violations = [];
  checkScope(violations, files, scope);
  checkTokens(violations, root);
  checkDeps(violations, root);
  checkEnums(violations, root);
  return violations;
}

// ---- CLI entry ----
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const violations = runChecks();
  if (violations.length) {
    log(`\n[M3.5 Freeze Guard] FAILED — ${violations.length} D-class violation(s):`);
    for (const v of violations) log("  - " + v);
    log("\nFix the violation or escalate to Product Owner before merge.");
    process.exit(1);
  }
  log("[M3.5 Freeze Guard] PASSED — no D-class violations.");
  process.exit(0);
}
