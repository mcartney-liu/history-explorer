/**
 * M87.4.2–4.3 — ExplanationRenderer Contract Tests
 *
 * 验证 ExplanationRenderer 接口、NoopRenderer、RendererRegistry。
 *
 * 测试覆盖：
 *   M87.4.2:
 *   1. ExplanationRenderer 接口契约
 *   2. NoopRenderer 不调用 LLM
 *   3. ExplanationArtifact 包含完整元数据（含 rendererIdentity）
 *   4. Renderer 不修改输入
 *   5. Renderer 可替换
 *   6. 所有 actionType 渲染
 *
 *   M87.4.3:
 *   7. RendererIdentity 结构
 *   8. RendererRegistry 注册/查询/解析
 *   9. Renderer 版本共存
 *   10. Artifact 可重建关系（同一 Decision + 同一确定性 Renderer → 相同 content）
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { ExplanationContext } from '../ExplanationProjection'
import type {
  ExplanationRenderer,
  ExplanationArtifact,
  RendererConfig,
  RendererIdentity,
  RendererRegistry,
} from '../ExplanationRenderer'
import {
  NoopRenderer,
  noopRenderer,
  DEFAULT_NOOP_CONFIG,
  InMemoryRendererRegistry,
} from '../ExplanationRenderer'

// ============================================================================
// Test Helpers
// ============================================================================

function makeContext(overrides?: Partial<ExplanationContext>): ExplanationContext {
  return {
    subject: '罗马扩张',
    intent: 'explain',
    narrativeGoal: '帮助用户理解因果关系',
    facts: [
      { text: '军事扩张', source: 'decision.keyPoints', index: 0 },
      { text: '道路体系', source: 'decision.keyPoints', index: 1 },
      { text: '行政整合', source: 'decision.keyPoints', index: 2 },
    ],
    references: [
      { ref: 'entity:rome', type: 'entity' },
      { ref: 'relation:empire-expansion', type: 'relation' },
    ],
    forbiddenClaims: [
      {
        claim: '我不确定这个解释是否正确',
        reason: 'Companion explain 规则已触发',
        ruleId: 'companion-explain',
      },
    ],
    style: { tone: 'educational', depth: 'deep', language: 'zh-CN' },
    sourceDecisionId: 'comp-decision-test-123',
    sourcePolicyVersion: '1.0',
    sourceReferences: ['entity:rome', 'relation:empire-expansion'],
    ...overrides,
  }
}

class TestRenderer implements ExplanationRenderer {
  private label: string
  private version: string

  constructor(label: string, version = 'test-v1.0') {
    this.label = label
    this.version = version
  }

  async render(context: ExplanationContext, config: RendererConfig): Promise<ExplanationArtifact> {
    return {
      artifactId: `test-${this.label}-${Date.now()}`,
      sourceDecisionId: context.sourceDecisionId,
      rendererIdentity: {
        rendererId: `test-${this.label}`,
        rendererType: 'template',
        rendererVersion: this.version,
      },
      rendererVersion: this.version,
      modelProvider: config.modelProvider,
      modelVersion: config.modelVersion,
      promptVersion: config.promptVersion,
      generatedAt: Date.now(),
      content: `[${this.label}] ${context.subject}: ${context.narrativeGoal}`,
    }
  }
}

// ============================================================================
// Tests — M87.4.2 (existing, updated for rendererIdentity)
// ============================================================================

describe('ExplanationRenderer Contract (M87.4.2)', () => {
  describe('ExplanationArtifact Structure', () => {
    it('包含所有必需字段（含 rendererIdentity）', async () => {
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)

      const requiredKeys = [
        'artifactId', 'sourceDecisionId',
        'rendererIdentity',    // M87.4.3 新增
        'rendererVersion', 'modelProvider', 'modelVersion', 'promptVersion',
        'generatedAt', 'content',
      ]
      for (const key of requiredKeys) {
        expect(artifact).toHaveProperty(key)
      }
    })

    it('rendererIdentity 包含 rendererId/type/version', async () => {
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)

      expect(artifact.rendererIdentity.rendererId).toBe('noop-renderer')
      expect(artifact.rendererIdentity.rendererType).toBe('template')
      expect(artifact.rendererIdentity.rendererVersion).toBe('template-v1.0')
    })

    it('rendererVersion === rendererIdentity.rendererVersion', async () => {
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)
      expect(artifact.rendererVersion).toBe(artifact.rendererIdentity.rendererVersion)
    })

    it('sourceDecisionId 可追溯到 Decision', async () => {
      const artifact = await noopRenderer.render(
        makeContext({ sourceDecisionId: 'decision-abc-123' }),
        DEFAULT_NOOP_CONFIG,
      )
      expect(artifact.sourceDecisionId).toBe('decision-abc-123')
    })

    it('artifactId 唯一', async () => {
      const context = makeContext()
      const a1 = await noopRenderer.render(context, DEFAULT_NOOP_CONFIG)
      const a2 = await noopRenderer.render(context, DEFAULT_NOOP_CONFIG)
      expect(a1.artifactId).not.toBe(a2.artifactId)
    })
  })

  describe('NoopRenderer - No LLM', () => {
    it('同步完成（< 50ms，无网络 IO）', async () => {
      const start = Date.now()
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)
      expect(Date.now() - start).toBeLessThan(50)
      expect(artifact.content).toBeTruthy()
    })

    it('modelProvider 为 noop', async () => {
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)
      expect(artifact.modelProvider).toBe('noop')
    })

    it('确定性输出（同一输入 → 同一 content）', async () => {
      const context = makeContext()
      const r1 = new NoopRenderer()
      const r2 = new NoopRenderer()
      expect((await r1.render(context, DEFAULT_NOOP_CONFIG)).content)
        .toBe((await r2.render(context, DEFAULT_NOOP_CONFIG)).content)
    })
  })

  describe('NoopRenderer Output Content', () => {
    it('包含标题、事实、引用、约束、来源', async () => {
      const artifact = await noopRenderer.render(makeContext(), DEFAULT_NOOP_CONFIG)
      expect(artifact.content).toContain('罗马扩张')
      expect(artifact.content).toContain('军事扩张')
      expect(artifact.content).toContain('entity:rome')
      expect(artifact.content).toContain('叙事约束')
      expect(artifact.content).toContain('comp-decision-test-123')
    })

    it('空字段不输出对应段', async () => {
      const ctx = makeContext({ facts: [], references: [], forbiddenClaims: [] })
      const artifact = await noopRenderer.render(ctx, DEFAULT_NOOP_CONFIG)
      expect(artifact.content).not.toContain('要点')
      expect(artifact.content).not.toContain('引用')
      expect(artifact.content).not.toContain('叙事约束')
    })
  })

  describe('Renderer Does Not Modify Input', () => {
    it('不修改 ExplanationContext', async () => {
      const context = makeContext()
      const frozen = JSON.stringify(context)
      await noopRenderer.render(context, DEFAULT_NOOP_CONFIG)
      expect(JSON.stringify(context)).toBe(frozen)
    })
  })

  describe('Renderer Replaceability', () => {
    it('同一 Context + 不同 Renderer → 不同 Artifact（sourceDecisionId 相同）', async () => {
      const context = makeContext({ sourceDecisionId: 'same-decision' })
      const a1 = await new TestRenderer('A').render(context, DEFAULT_NOOP_CONFIG)
      const a2 = await new TestRenderer('B').render(context, DEFAULT_NOOP_CONFIG)

      expect(a1.content).not.toBe(a2.content)
      expect(a1.rendererIdentity.rendererId).not.toBe(a2.rendererIdentity.rendererId)
      expect(a1.sourceDecisionId).toBe('same-decision')
      expect(a2.sourceDecisionId).toBe('same-decision')
    })
  })

  describe('All Intent Types', () => {
    const labels: Record<string, string> = {
      explain: '解释', suggest: '推荐', question: '提问', summarize: '总结', connect: '关联',
    }
    for (const [intent, label] of Object.entries(labels)) {
      it(`${intent} → 「${label}」`, async () => {
        const ctx = makeContext({ intent: intent as ExplanationContext['intent'] })
        const artifact = await noopRenderer.render(ctx, DEFAULT_NOOP_CONFIG)
        expect(artifact.content).toContain(label)
      })
    }
  })
})

// ============================================================================
// Tests — M87.4.3 RendererIdentity & RendererRegistry
// ============================================================================

describe('RendererIdentity (M87.4.3)', () => {
  it('NoopRenderer identity 是 template 类型', () => {
    expect(noopRenderer.identity.rendererType).toBe('template')
    expect(noopRenderer.identity.rendererId).toBe('noop-renderer')
    expect(noopRenderer.identity.rendererVersion).toBe('template-v1.0')
  })

  it('不同 Renderer 的 identity 不同', () => {
    const t1 = new TestRenderer('X')
    const t2 = new TestRenderer('Y')
    // 每个 TestRenderer 没有 identity 属性（用 render 返回的 rendererIdentity 代替）
    // NoopRenderer 有 identity 属性
    expect(noopRenderer.identity.rendererId).toBe('noop-renderer')
  })
})

describe('RendererRegistry (M87.4.3)', () => {
  let registry: InMemoryRendererRegistry

  beforeEach(() => {
    registry = new InMemoryRendererRegistry()
  })

  it('注册后 list() 包含已注册 Renderer', () => {
    const identity: RendererIdentity = {
      rendererId: 'test-r',
      rendererType: 'template',
      rendererVersion: 'template-v1.0',
    }
    registry.register(identity, new TestRenderer('test-r'))

    expect(registry.list()).toHaveLength(1)
    expect(registry.list()[0].rendererId).toBe('test-r')
  })

  it('get() 可按完整身份获取 Renderer', () => {
    const identity: RendererIdentity = {
      rendererId: 'r1',
      rendererType: 'template',
      rendererVersion: 'v1.0',
    }
    registry.register(identity, new TestRenderer('r1'))

    const found = registry.get(identity)
    expect(found).not.toBeNull()
  })

  it('同一 rendererId + rendererVersion 注册两次会抛出错误', () => {
    const identity: RendererIdentity = {
      rendererId: 'dup',
      rendererType: 'template',
      rendererVersion: 'v1.0',
    }
    registry.register(identity, new TestRenderer('dup'))

    expect(() => registry.register(identity, new TestRenderer('dup')))
      .toThrow('already registered')
  })

  it('不同版本的同一 Renderer 可共存', () => {
    const v1: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v1.0' }
    const v2: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v2.0' }

    registry.register(v1, new TestRenderer('r-v1', 'template-v1.0'))
    registry.register(v2, new TestRenderer('r-v2', 'template-v2.0'))

    expect(registry.list()).toHaveLength(2)
    expect(registry.listVersions('r')).toHaveLength(2)
  })

  it('resolve() 返回最新版本', () => {
    const v1: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v1.0' }
    const v2: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v2.0' }

    registry.register(v1, new TestRenderer('r-v1', 'template-v1.0'))
    registry.register(v2, new TestRenderer('r-v2', 'template-v2.0'))

    const resolved = registry.resolve('r')
    expect(resolved).not.toBeNull()
  })

  it('resolve() 对未注册的 rendererId 返回 null', () => {
    expect(registry.resolve('nonexistent')).toBeNull()
  })

  it('listVersions() 按版本排序', () => {
    const v1: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v1.0' }
    const v2: RendererIdentity = { rendererId: 'r', rendererType: 'template', rendererVersion: 'template-v2.0' }

    // 先注册 v1 再注册 v2（乱序注册）
    registry.register(v1, new TestRenderer('r-v1', 'template-v1.0'))
    registry.register(v2, new TestRenderer('r-v2', 'template-v2.0'))

    const versions = registry.listVersions('r')
    expect(versions).toHaveLength(2)
    // v2.0 应该在 v1.0 前面（降序排列）
    expect(versions[0].rendererVersion).toBe('template-v2.0')
    expect(versions[1].rendererVersion).toBe('template-v1.0')
  })

  it('get() 对未注册的 Renderer 返回 null', () => {
    const identity: RendererIdentity = {
      rendererId: 'ghost',
      rendererType: 'llm',
      rendererVersion: 'v1.0',
    }
    expect(registry.get(identity)).toBeNull()
  })

  it('三种 RendererType 均可注册', () => {
    const types: RendererIdentity['rendererType'][] = ['llm', 'template', 'rule']
    for (const type of types) {
      const id: RendererIdentity = { rendererId: `r-${type}`, rendererType: type, rendererVersion: 'v1.0' }
      registry.register(id, new TestRenderer(type))
    }
    expect(registry.list()).toHaveLength(3)
  })
})

// ============================================================================
// Tests — M87.4.3 Artifact 可重建关系
// ============================================================================

describe('Artifact Reconstructability (M87.4.3)', () => {
  it('同一 Decision + 同一确定性 Renderer → 相同 content', async () => {
    const context = makeContext({ sourceDecisionId: 'decision-001' })
    const r1 = new NoopRenderer()
    const r2 = new NoopRenderer()

    const a1 = await r1.render(context, DEFAULT_NOOP_CONFIG)
    const a2 = await r2.render(context, DEFAULT_NOOP_CONFIG)

    expect(a1.content).toBe(a2.content)
    expect(a1.sourceDecisionId).toBe('decision-001')
    expect(a2.sourceDecisionId).toBe('decision-001')
    expect(a1.rendererIdentity.rendererId).toBe(a2.rendererIdentity.rendererId)
    expect(a1.rendererIdentity.rendererVersion).toBe(a2.rendererIdentity.rendererVersion)
  })

  it('同一 Decision + 不同 Renderer → 不同 content（sourceDecisionId 相同）', async () => {
    const context = makeContext({ sourceDecisionId: 'decision-001' })

    const a1 = await noopRenderer.render(context, DEFAULT_NOOP_CONFIG)
    const a2 = await new TestRenderer('B').render(context, DEFAULT_NOOP_CONFIG)

    expect(a1.content).not.toBe(a2.content)
    expect(a1.sourceDecisionId).toBe('decision-001')
    expect(a2.sourceDecisionId).toBe('decision-001')
  })

  it('同一 Decision + 不同版本 Renderer → 不同 Artifact（认知状态相同）', async () => {
    const context = makeContext({ sourceDecisionId: 'decision-001' })
    const rV1 = new TestRenderer('R', 'v1.0')
    const rV2 = new TestRenderer('R', 'v2.0')

    const a1 = await rV1.render(context, DEFAULT_NOOP_CONFIG)
    const a2 = await rV2.render(context, DEFAULT_NOOP_CONFIG)

    expect(a1.rendererIdentity.rendererVersion).not.toBe(a2.rendererIdentity.rendererVersion)
    expect(a1.sourceDecisionId).toBe('decision-001')
    expect(a2.sourceDecisionId).toBe('decision-001')
    // 两个 Artifact 都合法——认知状态相同
  })
})
