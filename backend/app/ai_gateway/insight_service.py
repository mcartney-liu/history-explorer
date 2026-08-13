"""实体历史见解生成服务 — AI 调用唯一入口（C5 AI 归位）。

main.py 不得直接触碰 provider 接线 / LLM 调用（thin-delegate guardrail，
test_main_py_ai_handler_is_thin_delegate 整文件扫描 provider.(complete|chat)、
get_provider 等字样）。本模块承载 prompt 构造 + complete 调用 + 异常归一。
"""

from .provider import resolve_provider


class InsightGenerationError(Exception):
    """AI 生成失败（未启用 / 网络 / 模型 / 空内容），由调用方映射为 HTTP 错误。"""


def generate_insight_text(evidence_lines: list[str], entity_name: str = "") -> str:
    """基于证据行生成实体历史见解（简体中文，严格限定证据范围）。

    Args:
        evidence_lines: 已格式化的证据行（"- 声明（来源：书名）"）。
        entity_name: 实体显示名（如「罗马文明」）。传给 prompt 让 AI 围绕
            该实体本身组织内容，避免把证据中出现的相近概念（如「罗马帝国」）
            误当作实体名使用。

    Returns:
        生成的见解文本。

    Raises:
        InsightGenerationError: AI 未启用、调用失败或未返回内容。
    """
    provider = resolve_provider()
    if provider is None:
        raise InsightGenerationError("AI 服务未启用")

    subject = entity_name.strip() if entity_name and entity_name.strip() else "该实体"
    system_prompt = (
        "你是严谨的历史研究助手。请仅依据下方提供的证据生成该实体的历史见解。"
        "严格限定在证据范围内，不得添加证据之外的事实或推测。使用简体中文。"
        "**输出格式要求：纯文本，禁止使用任何 Markdown 语法（如 **加粗**、# 标题、- 列表、> 引用、代码块等）。"
        "如果需要分段，请直接换行；不需要任何修饰符号。**"
    )
    user_prompt = (
        f"实体名称：{subject}\n\n"
        "证据：\n"
        + "\n".join(evidence_lines)
        + f"\n\n请围绕「{subject}」本身组织内容，阐述该实体在历史上的意义与影响（历史见解）。"
        "注意：证据中可能出现与实体相近的其他概念（如「罗马帝国」之于「罗马文明」），"
        "请以实体名称为准组织内容，不要用相近概念替代实体本身。"
        "再次强调：纯文本输出，不要 Markdown 装饰。"
    )

    try:
        text = provider.complete(system_prompt, user_prompt, max_tokens=500).strip()
    except Exception as e:  # noqa: BLE001 — network/model errors surface as HTTP 502
        raise InsightGenerationError(f"AI 生成失败：{e}")

    if not text:
        raise InsightGenerationError("AI 未返回内容。")

    return text
