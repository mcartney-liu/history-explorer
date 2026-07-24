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
import { runChecks } from "./freeze-check.mjs";

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

test("2. backend/app/ai_gateway/ is ALLOWED", () => {
  const root = makeProject(VALID);
  const v = runChecks({ root, files: VALID.map((f) => f.rel) });
  assert.equal(
    v.length,
    0,
    "expected no violations for approved M11 scenario, got: " + JSON.stringify(v)
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

test("5. approved provider (openai) PASSES", () => {
  const root = makeProject(VALID);
  const v = runChecks({ root, files: VALID.map((f) => f.rel) });
  assert.equal(
    v.length,
    0,
    "approved provider must pass, got: " + JSON.stringify(v)
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
