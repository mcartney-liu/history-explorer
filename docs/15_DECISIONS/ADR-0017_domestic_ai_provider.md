# ADR-0017: 国产大模型 Provider 接入（OpenAI 兼容，零新增依赖）

## Status
Accepted（PO 口头批准 2026-08-08，走正规 Freeze Revision Gate）

## Background
- AI Gateway 自 ADR-0003（M11）起已批准：后端 `backend/app/ai_gateway/` + 前端
  ResearchPanel / HistorianChat / GroundedAnswer 全套已建好，默认
  `AI_GATEWAY_ENABLED=false`（行为字节一致，M73 保证）。
- 现有 `provider.py` 仅有 `OpenAIProvider`，硬编码 `model="gpt-4o-mini"`，未接收 `base_url`。
- PO 2026-08-08 决策：在当前版本（phase5/reconstruction，5174）接入国产模型，
  用于「研究探索增强」（Article 0 探索层辅助，明确不做推荐引擎）；并明确「走正规 Gate」。

## Decision
- 扩展 `OpenAIProvider` 接收 `base_url` 与 `model` 参数，由 `AI_BASE_URL` / `AI_MODEL`
  环境变量驱动。
- 复用已白名单的 `openai` SDK（OpenAI 兼容接口），通过 `base_url` 重定向到国产
  Provider（DeepSeek `https://api.deepseek.com/v1` / 通义 / 智谱等）。**零新增依赖**。
- `backend/app/ai_gateway/provider.py` 通过本 ADR 加入 `SCOPE_ALLOWLIST`
  （Freeze Revision Gate）；`config.py` 已在白名单。
- 密钥与开关仅来自环境变量 / `backend/.env`（gitignored），绝不进版本库。
- `backend/config.py` 内置极简 `.env` 加载器（标准库，无 python-dotenv 新依赖）。

## Consequences
- 正面：国产模型可配置接入，无新依赖、无 RAG / 向量 / Neo4j；grounding + 确定性
  fallback 保持不变；Article 0 探索层边界保持（辅助探索，不替用户下结论）。
- 负面：Provider 切换需正确填写 `AI_BASE_URL`（依各厂文档，通常含 `/v1` 路径）
  + `AI_MODEL`；错误值会触发 `provider_error` → 确定性 fallback（不崩溃，体验降级）。
- 不变：`openai` 仍是唯一白名单 SDK；`provider.py` 之外 AI 绝对禁止的规则不变；
  默认 `AI_GATEWAY_ENABLED=false` 时行为完全不变。

## Related ADRs
- ADR-0003（M11 接地 AI 解释层，AI 运行时批准基础）
- ADR-0016（图标零依赖，同「复用已批准依赖、不引入新依赖」原则）
