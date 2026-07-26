#!/usr/bin/env node
// History Explorer — M11 Freeze Revision governance tests.
//
// Validates the freeze guard's GOVERNANCE logic (not implementation):
//   - AI code outside the approved module FAILs (token + scope).
//   - backend/app/ai_gateway/ is allowed (with the approved provider SDK).
//   - neo4j / vector-DB / non-approved AI SDK dependencies FAIL.
//   - the approved provider SDK PASSes.
//
// Run with:  node --test scripts/freeze-check.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runChecks, SCOPE_ALLOWLIST } from "./freeze-check.mjs";

function makeProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "he-freeze-"));
  for (const f of files) {
    const p = path.join(root, f.rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content);
  }
  return root;
}

const PKG_OK = JSON.stringify({
  dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
  devDependencies: {},
});

// Valid M11 scenario: ai_gateway module + approved provider dep + no forbidden infra.
const VALID = [
  {
    rel: "backend/app/ai_gateway/provider.py",
    content:
      "import openai\n\n\ndef ask():\n    return openai.ChatCompletion.create(model='gpt-4')\n",
  },
  { rel: "backend/requirements.txt", content: "fastapi\nuvicorn\nopenai\n" },
  { rel: "frontend/package.json", content: PKG_OK },
];

test("1. AI code OUTSIDE approved path FAILS (token + scope)", () => {
  const root = makeProject([
    {
      rel: "backend/app/random_ai.py",
      content: "import openai\nx = openai.ChatCompletion.create()\n",
    },
    { rel: "backend/requirements.txt", content: "fastapi\nuvicorn\nopenai\n" },
    { rel: "frontend/package.json", content: PKG_OK },
  ]);
  const v = runChecks({
    root,
    files: ["backend/app/random_ai.py", "backend/requirements.txt", "frontend/package.json"],
  });
  assert.ok(
    v.some((x) => x.startsWith("TOKEN")),
    "expected TOKEN violation for openai outside approved module, got: " + JSON.stringify(v)
  );
  assert.ok(
    v.some((x) => x.startsWith("SCOPE")),
    "expected SCOPE violation for backend/app change, got: " + JSON.stringify(v)
  );
});

test("2. ai_gateway change is SCOPE-blocked under M24 allowlist, but openai token still allowed inside it", () => {
  const root = makeProject(VALID);
  const v = runChecks({ root, files: VALID.map((f) => f.rel) });
  assert.ok(
    v.some((x) => x.startsWith("SCOPE")),
    "expected SCOPE violation for ai_gateway change under M24 allowlist mode, got: " + JSON.stringify(v)
  );
  assert.ok(
    !v.some((x) => x.startsWith("TOKEN")),
    "openai inside ai_gateway must NOT raise a TOKEN violation, got: " + JSON.stringify(v)
  );
});

test("3. neo4j dependency FAILS", () => {
  const root = makeProject([
    { rel: "backend/requirements.txt", content: "fastapi\nuvicorn\nneo4j\n" },
    { rel: "frontend/package.json", content: PKG_OK },
  ]);
  const v = runChecks({ root, files: ["backend/requirements.txt", "frontend/package.json"] });
  assert.ok(
    v.some((x) => x.startsWith("DEP") && /neo4j/i.test(x)),
    "expected neo4j DEP violation, got: " + JSON.stringify(v)
  );
});

test("4. vector database dependency FAILS", () => {
  const root = makeProject([
    { rel: "backend/requirements.txt", content: "fastapi\nuvicorn\nchromadb\n" },
    { rel: "frontend/package.json", content: PKG_OK },
  ]);
  const v = runChecks({ root, files: ["backend/requirements.txt", "frontend/package.json"] });
  assert.ok(
    v.some((x) => x.startsWith("DEP") && /non-approved AI SDK|chromadb/i.test(x)),
    "expected vector-DB DEP violation, got: " + JSON.stringify(v)
  );
});

test("5. approved provider (openai) passes TOKEN/DEP checks", () => {
  const root = makeProject(VALID);
  const v = runChecks({ root, files: VALID.map((f) => f.rel) });
  assert.ok(
    !v.some((x) => x.startsWith("TOKEN")),
    "approved provider openai must not raise TOKEN violation, got: " + JSON.stringify(v)
  );
  assert.ok(
    !v.some((x) => x.startsWith("DEP")),
    "approved provider openai must not raise DEP violation, got: " + JSON.stringify(v)
  );
});

test("6. non-approved AI SDK (langchain) FAILS", () => {
  const root = makeProject([
    { rel: "backend/requirements.txt", content: "fastapi\nuvicorn\nlangchain\n" },
    { rel: "frontend/package.json", content: PKG_OK },
  ]);
  const v = runChecks({ root, files: ["backend/requirements.txt", "frontend/package.json"] });
  assert.ok(
    v.some((x) => x.startsWith("DEP") && /non-approved AI SDK/i.test(x)),
    "expected non-approved AI SDK DEP violation, got: " + JSON.stringify(v)
  );
});

test("7. M24 allowlist: dataset.py + dataset test PASS, other backend files blocked", () => {
  const root = makeProject(VALID);
  const allowed = runChecks({
    root,
    files: ["backend/app/core/dataset.py", "backend/tests/test_dataset_metadata.py"],
  });
  assert.ok(
    !allowed.some((x) => x.startsWith("SCOPE")),
    "M24-approved dataset files must NOT raise SCOPE violation, got: " + JSON.stringify(allowed)
  );
  const blocked = runChecks({ root, files: ["backend/app/core/global_graph.py"] });
  assert.ok(
    blocked.some((x) => x.startsWith("SCOPE")),
    "non-allowlisted backend file must raise SCOPE violation, got: " + JSON.stringify(blocked)
  );
});

test("8. M25.1 allowlist: 4 new dataset-provider/validator files exist in allowlist and PASS scope", () => {
  const M25_1_ALLOWED = [
    "backend/app/core/dataset_provider.py",
    "backend/app/core/dataset_validator.py",
    "backend/tests/test_dataset_provider.py",
    "backend/tests/test_dataset_validator.py",
  ];
  // (a) direct membership — these files MUST be present in the PO-approved allowlist.
  for (const f of M25_1_ALLOWED) {
    assert.ok(
      SCOPE_ALLOWLIST.includes(f),
      `expected ${f} to be in SCOPE_ALLOWLIST (M25.1 Freeze Revision Gate), got: ` +
        JSON.stringify(SCOPE_ALLOWLIST)
    );
  }
  // (b) behavioral — a change to only these files must NOT raise a SCOPE violation.
  const root = makeProject(VALID);
  const v = runChecks({ root, files: M25_1_ALLOWED });
  assert.ok(
    !v.some((x) => x.startsWith("SCOPE")),
    "M25.1-approved dataset-provider/validator files must NOT raise SCOPE violation, got: " +
      JSON.stringify(v)
  );
  // (c) regression guard — M24 entries still present.
  assert.ok(
    SCOPE_ALLOWLIST.includes("backend/app/core/dataset.py"),
    "M24 entry dataset.py must remain in SCOPE_ALLOWLIST"
  );
  assert.ok(
    SCOPE_ALLOWLIST.includes("backend/tests/test_dataset_metadata.py"),
    "M24 entry test_dataset_metadata.py must remain in SCOPE_ALLOWLIST"
  );
});

test("9. M26.1 allowlist: 6 new source-registry/evidence-claim files present; M24+M25.1 retained", () => {
  const M26_1_ALLOWED = [
    "backend/app/core/source_registry.py",
    "backend/app/core/evidence_claim.py",
    "backend/tests/test_source_registry.py",
    "backend/tests/test_evidence_claim.py",
    "data/sources.json",
    "data/evidence_claims.json",
  ];
  // (a) direct membership — these files MUST be present in the PO-approved allowlist.
  for (const f of M26_1_ALLOWED) {
    assert.ok(
      SCOPE_ALLOWLIST.includes(f),
      `expected ${f} to be in SCOPE_ALLOWLIST (M26.1 Freeze Revision Gate), got: ` +
        JSON.stringify(SCOPE_ALLOWLIST)
    );
  }
  // (b) behavioral — a change to only these files must NOT raise a SCOPE violation.
  const root = makeProject(VALID);
  const v = runChecks({ root, files: M26_1_ALLOWED });
  assert.ok(
    !v.some((x) => x.startsWith("SCOPE")),
    "M26.1-approved files must NOT raise SCOPE violation, got: " + JSON.stringify(v)
  );
  // (c) regression guard — M24 + M25.1 entries still present.
  const RETAINED = [
    "backend/app/core/dataset.py",
    "backend/tests/test_dataset_metadata.py",
    "backend/app/core/dataset_provider.py",
    "backend/app/core/dataset_validator.py",
    "backend/tests/test_dataset_provider.py",
    "backend/tests/test_dataset_validator.py",
  ];
  for (const f of RETAINED) {
    assert.ok(
      SCOPE_ALLOWLIST.includes(f),
      `expected ${f} retained in SCOPE_ALLOWLIST, got: ` + JSON.stringify(SCOPE_ALLOWLIST)
    );
  }
});
