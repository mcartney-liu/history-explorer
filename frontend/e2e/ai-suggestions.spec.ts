// M74-003 (C3-2) — Cases 2 & 3: Feature ON (:5174, VITE_AI_SUGGESTIONS_ENABLED=true).
// All backend/AI calls are MOCKED via page.route() (PO: 禁止调用真实 backend).
//
// Case 2 — Package page (T1): shows exploration suggestions + TrustDisplay
//          with source binding, engine=deterministic.
// Case 3 — Entity page (T2): shows relationship insight + evidence +
//          deterministic badge.
import { test, expect } from '@playwright/test'

const AI_RESPONSE = {
  answer: '基于知识库证据：Augustus 与罗马帝国的建立密切相关。',
  citations: [],
  rejected_citations: [],
  grounded: true,
  engine: 'deterministic',
  question: '探索建议',
  context_global_ids: ['roman_empire:person-augustus'],
  mode: 'explain',
  evidence: [
    { global_id: 'roman_empire:person-augustus', kind: 'entity', label: 'person-augustus', status: 'verified' },
  ],
  next_exploration: [
    {
      global_id: 'roman_empire:event-roman-empire-established',
      label: 'Roman Empire Established',
      relationship: 'participated_in',
      source_id: 'src-tacitus-ann',
      claim_ids: ['ec-rom-021'],
      // M74-004-002 (2B): Evidence Card detail — backend Planner fields.
      reason: '因为该事件与焦点实体的关系有已校验证据支持',
      claim_text: 'Augustus 成为首位罗马皇帝。',
      source_title: '塔西佗编年史',
      source_tier: 'primary',
    },
  ],
}

/** Minimal EntityDetail the EntityPage consumes (type/name/relationships/...). */
const ENTITY_RESPONSE = {
  id: 'person-augustus',
  type: 'Person',
  name: 'Augustus',
  summary: { text: 'Augustus was the first Roman emperor.' },
  timeline: [],
  relationships: [],
  exploration: {
    main_entity: { global_id: 'roman_empire:person-augustus', name: 'Augustus', type: 'Person' },
    related_entities: [],
  },
}

async function mockAI(page: import('@playwright/test').Page) {
  // CRITICAL: keep globs anchored to the BACKEND host. `**/entity/*` would
  // also match vite module URLs like /src/data/entity/entityLabels.ts and
  // break the app — mock only real backend requests.
  await page.route('http://localhost:8000/api/v1/ai/explain', async (route) => {
    console.log('[MOCK-AI] intercepted:', route.request().url())
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AI_RESPONSE) })
  })
  await page.route('http://localhost:8000/topics', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  await page.route('http://localhost:8000/entity/*', async (route) => {
    console.log('[MOCK-ENTITY] intercepted:', route.request().url())
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ENTITY_RESPONSE) })
  })
}

test.describe('AI suggestions — Feature ON (:5174, mocked backend)', () => {
  test('Case 2 — Package page shows suggestions + TrustDisplay + source', async ({
    page,
  }) => {
    await mockAI(page)
    await page.goto('/#/package/roman-empire-exploration', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: /罗马帝国/ }).first().waitFor({ timeout: 30_000 })

    // T1 touchpoint renders with evidence-based copy (never "AI 生成")
    const suggestions = page.getByTestId('exploration-suggestions')
    await expect(suggestions).toHaveCount(1)
    await expect(suggestions.getByText('基于知识库证据的探索建议')).toBeVisible()
    await expect(suggestions.getByText('确定性输出')).toBeVisible()
    // suggestion item + source binding
    await expect(suggestions.getByText('Roman Empire Established')).toBeVisible()
    await expect(suggestions.getByText('participated_in')).toBeVisible()
    await expect(suggestions.getByText('src-tacitus-ann')).toBeVisible()
    // M74-004-002 (2B): Evidence Card — reason / claim_text / source_title / tier
    await expect(suggestions.getByText('推荐原因')).toBeVisible()
    await expect(suggestions.getByText('因为该事件与焦点实体的关系有已校验证据支持')).toBeVisible()
    await expect(suggestions.getByText('证据原文')).toBeVisible()
    await expect(suggestions.getByText('Augustus 成为首位罗马皇帝。')).toBeVisible()
    await expect(suggestions.getByText('塔西佗编年史')).toBeVisible()
    await expect(suggestions.getByText('一手史料')).toBeVisible()
    // deterministic output must NOT be labeled AI-generated
    await expect(suggestions.getByText('AI 生成')).toHaveCount(0)
  })

  test('Case 3 — Entity page shows relationship insight + evidence + deterministic', async ({
    page,
  }) => {
    await mockAI(page)
    await page.goto('/#/package/roman-empire-exploration', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: /罗马帝国/ }).first().waitFor({ timeout: 30_000 })

    // Navigate into an entity via the deterministic Guide's next step.
    await page.getByRole('button', { name: /查看 .* →/ }).first().click()
    // Entity page + RelationshipInsight render from mocked data.
    const insight = page.getByTestId('relationship-insight')
    await expect(insight).toBeVisible({ timeout: 10_000 })
    // explanation paragraph (unique) carries the evidence-based prefix
    await expect(insight.locator('.relationship-insight-answer')).toBeVisible()
    await expect(insight.locator('.relationship-insight-answer')).toContainText('基于知识库证据')
    await expect(insight.getByText('确定性输出')).toBeVisible()
    await expect(insight.getByText('person-augustus', { exact: true })).toBeVisible() // evidence
    await expect(insight.getByText('src-tacitus-ann')).toBeVisible() // source
    await expect(insight.getByText('AI 生成')).toHaveCount(0)
  })
})
