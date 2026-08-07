/**
 * M87.4.2–4.3 — Explanation Renderer System
 *
 * ExplanationRenderer 接口 + Renderer 版本管理 + NoopRenderer 默认实现。
 *
 * 核心原则：
 *   - LLM is a Renderer, not a Reasoner
 *   - Renderer 只负责语言表达，不参与认知判断
 *   - Renderer 可替换——接口不绑定具体模型
 *   - 输出 ExplanationArtifact（非裸字符串），包含完整元数据
 *   - Renderer Version 不影响 Replay——Decision 相同则认知状态相同
 *
 * 约束：
 *   - 不修改 ExplanationContext / Decision
 *   - 不访问 MemoryStore / Knowledge Graph / Search / Policy
 *   - 不生成新事实
 *   - 不声称 forbiddenClaims 中的内容
 *
 * M87.4.2: NoopRenderer（不调用 LLM，纯结构化输出）
 * M87.4.3: RendererIdentity + RendererRegistry + ModelMetadata
 */

import type { ExplanationContext } from '../companion/ExplanationProjection'

// ============================================================================
// M87.4.3 — RendererIdentity
// ============================================================================

/** Renderer 类型 */
export type RendererType = 'llm' | 'template' | 'rule'

/** Renderer 身份标识 */
export interface RendererIdentity {
  /** 唯一标识 */
  rendererId: string
  /** Renderer 类型 */
  rendererType: RendererType
  /** 版本号（格式：{type}-v{major}.{minor}） */
  rendererVersion: string
}

// ============================================================================
// M87.4.3 — ModelMetadata（仅 llm 类型 Renderer）
// ============================================================================

/** 模型元数据——仅 llm 类型 Renderer 使用 */
export interface ModelMetadata {
  /** 模型提供方 */
  provider: string
  /** 模型标识 */
  model: string
  /** 模型版本 */
  modelVersion: string
  /** Prompt 版本 */
  promptVersion: string
  /** 温度（可选） */
  temperature?: number
  /** 最大 Token（可选） */
  maxTokens?: number
}

// ============================================================================
// ExplanationArtifact（Renderer 输出——非裸字符串）
// ============================================================================

export interface ExplanationArtifact {
  /** 唯一标识 */
  artifactId: string
  /** 来源 Decision ID（可追溯到 Runtime） */
  sourceDecisionId: string
  // ── M87.4.3 新增 ──
  /** Renderer 身份标识 */
  rendererIdentity: RendererIdentity
  // ── 保留（向后兼容） ──
  /** Renderer 版本（= rendererIdentity.rendererVersion） */
  rendererVersion: string
  /** 模型提供方（noop / openai / anthropic / ...） */
  modelProvider: string
  /** 模型版本 */
  modelVersion: string
  /** Prompt 版本 */
  promptVersion: string
  // ── 保留 ──
  /** 生成时间戳 */
  generatedAt: number
  /** 最终文本 */
  content: string
}

// ============================================================================
// RendererConfig（Renderer 配置）
// ============================================================================

export interface RendererConfig {
  /** 模型提供方标识 */
  modelProvider: string
  /** 模型版本标识 */
  modelVersion: string
  /** Prompt 版本标识 */
  promptVersion: string
  /** 最大 Token 数（可选） */
  maxTokens?: number
  /** 温度（可选） */
  temperature?: number
}

// ============================================================================
// M87.4.3 — RendererRegistry
// ============================================================================

/**
 * RendererRegistry 管理所有已注册的 Renderer 实例。
 *
 * 行为：
 *   - 同一 rendererId + rendererVersion 只能注册一次
 *   - 不同版本的同一 Renderer 可共存
 *   - resolve(rendererId) 返回最新版本
 */
export interface RendererRegistry {
  /** 注册 Renderer */
  register(identity: RendererIdentity, renderer: ExplanationRenderer): void
  /** 按完整身份获取 Renderer */
  get(identity: RendererIdentity): ExplanationRenderer | null
  /** 按 rendererId 获取最新版本 */
  resolve(rendererId: string): ExplanationRenderer | null
  /** 列出所有已注册的 Renderer 身份 */
  list(): RendererIdentity[]
  /** 按 rendererId 列出所有版本 */
  listVersions(rendererId: string): RendererIdentity[]
}

// ============================================================================
// ExplanationRenderer（核心接口）
// ============================================================================

/**
 * ExplanationRenderer 是语言渲染接口。
 *
 * 输入：ExplanationContext（结构化叙事上下文）
 * 输出：ExplanationArtifact（结构化输出，含完整元数据）
 *
 * 禁止：
 *   - 修改 ExplanationContext
 *   - 修改 Decision
 *   - 写 Memory / MemoryStore
 *   - 写 Runtime State
 *   - 调用 Policy / Evaluator
 *   - 生成新事实
 *   - 声称 forbiddenClaims 中的内容
 *   - 调用 Knowledge Graph / Search API
 */
export interface ExplanationRenderer {
  render(
    context: ExplanationContext,
    config: RendererConfig,
  ): Promise<ExplanationArtifact>
}

// ============================================================================
// NoopRenderer（M87.4.2 默认实现——不调用 LLM）
// M87.4.3 更新：增加 RendererIdentity
// ============================================================================

/**
 * NoopRenderer 是 ExplanationRenderer 的默认实现。
 *
 * 不调用任何 LLM——直接将 ExplanationContext 序列化为结构化文本。
 *
 * 目的：
 *   - 验证 Renderer Contract 接口正确
 *   - 验证 ExplanationContext 可渲染
 *   - 验证 ExplanationArtifact 包含完整元数据（含 rendererIdentity）
 *   - 不绑定任何具体模型
 *
 * 输出格式：结构化文本，包含叙事目标、事实列表、引用、约束说明
 */
export class NoopRenderer implements ExplanationRenderer {
  /** M87.4.3: Renderer 身份标识 */
  readonly identity: RendererIdentity = {
    rendererId: 'noop-renderer',
    rendererType: 'template',
    rendererVersion: 'template-v1.0',
  }

  private counter = 0

  async render(
    context: ExplanationContext,
    config: RendererConfig,
  ): Promise<ExplanationArtifact> {
    this.counter++

    const content = this.buildContent(context)

    return {
      artifactId: `artifact-${Date.now()}-${this.counter}`,
      sourceDecisionId: context.sourceDecisionId,
      rendererIdentity: { ...this.identity },
      rendererVersion: this.identity.rendererVersion,
      modelProvider: config.modelProvider,
      modelVersion: config.modelVersion,
      promptVersion: config.promptVersion,
      generatedAt: Date.now(),
      content,
    }
  }

  // ==========================================================================
  // 内容构建（纯结构化序列化，不调用 LLM）
  // ==========================================================================

  private buildContent(context: ExplanationContext): string {
    const parts: string[] = []

    // 1. 叙事标题 + 意图
    parts.push(this.buildHeader(context))

    // 2. 事实列表
    if (context.facts.length > 0) {
      parts.push(this.buildFacts(context))
    }

    // 3. 引用
    if (context.references.length > 0) {
      parts.push(this.buildReferences(context))
    }

    // 4. 叙事约束（forbiddenClaims）
    if (context.forbiddenClaims.length > 0) {
      parts.push(this.buildConstraints(context))
    }

    // 5. 来源
    parts.push(this.buildSource(context))

    return parts.join('\n\n')
  }

  private buildHeader(context: ExplanationContext): string {
    const intentLabel = this.intentLabel(context.intent)
    return `【${intentLabel}】${context.subject}\n\n目标：${context.narrativeGoal}`
  }

  private buildFacts(context: ExplanationContext): string {
    const items = context.facts.map((f) => `  ${f.index + 1}. ${f.text}`)
    return `要点：\n${items.join('\n')}`
  }

  private buildReferences(context: ExplanationContext): string {
    const items = context.references.map((r) => `  - ${r.ref} (${r.type})`)
    return `引用：\n${items.join('\n')}`
  }

  private buildConstraints(context: ExplanationContext): string {
    const items = context.forbiddenClaims.map(
      (c) => `  - 禁止声称「${c.claim}」\n    原因：${c.reason}`,
    )
    return `叙事约束：\n${items.join('\n')}`
  }

  private buildSource(context: ExplanationContext): string {
    return `---\n来源：Decision ${context.sourceDecisionId}\n策略版本：${context.sourcePolicyVersion}`
  }

  private intentLabel(intent: ExplanationContext['intent']): string {
    switch (intent) {
      case 'explain': return '解释'
      case 'suggest': return '推荐'
      case 'question': return '提问'
      case 'summarize': return '总结'
      case 'connect': return '关联'
    }
  }
}

// ============================================================================
// 默认实例
// ============================================================================

export const noopRenderer = new NoopRenderer()

// ============================================================================
// 默认配置
// ============================================================================

export const DEFAULT_NOOP_CONFIG: RendererConfig = {
  modelProvider: 'noop',
  modelVersion: 'template-v1.0',
  promptVersion: 'noop-v1',
}

// ============================================================================
// InMemoryRendererRegistry（M87.4.3）
// ============================================================================

/**
 * InMemoryRendererRegistry 是 RendererRegistry 的内存态默认实现。
 *
 * 行为：
 *   - 同一 rendererId + rendererVersion 注册两次会抛出错误
 *   - resolve(rendererId) 返回最新版本（按版本号字符串排序）
 *   - 不同版本的同一 Renderer 可共存
 */
export class InMemoryRendererRegistry implements RendererRegistry {
  private renderers = new Map<string, ExplanationRenderer>()
  private identities: RendererIdentity[] = []

  register(identity: RendererIdentity, renderer: ExplanationRenderer): void {
    const key = this.makeKey(identity)
    if (this.renderers.has(key)) {
      throw new Error(
        `Renderer already registered: ${identity.rendererId}@${identity.rendererVersion}`,
      )
    }
    this.renderers.set(key, renderer)
    this.identities.push({ ...identity })
  }

  get(identity: RendererIdentity): ExplanationRenderer | null {
    return this.renderers.get(this.makeKey(identity)) ?? null
  }

  resolve(rendererId: string): ExplanationRenderer | null {
    const versions = this.identities
      .filter((id) => id.rendererId === rendererId)
      .sort((a, b) => b.rendererVersion.localeCompare(a.rendererVersion))

    if (versions.length === 0) return null

    return this.renderers.get(this.makeKey(versions[0])) ?? null
  }

  list(): RendererIdentity[] {
    return [...this.identities]
  }

  listVersions(rendererId: string): RendererIdentity[] {
    return this.identities
      .filter((id) => id.rendererId === rendererId)
      .sort((a, b) => b.rendererVersion.localeCompare(a.rendererVersion))
  }

  private makeKey(identity: RendererIdentity): string {
    return `${identity.rendererId}@${identity.rendererVersion}`
  }
}
