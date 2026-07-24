"""Prompt management for the grounded AI interpretation layer.

Every prompt enforces the grounding contract from ADR-0003:
- answer ONLY from the facts provided in [ALLOWED FACTS];
- cite the sources used;
- never invent facts, dates, people, or events;
- never claim relationships absent from the provided facts;
- never modify, extend, or rewrite the knowledge graph.
"""
from typing import List


SYSTEM_PROMPT = """You are a careful historian assistant for History Explorer.
You explain and synthesize knowledge that already exists in the user's exploration.
Rules you MUST follow:
1. Use ONLY the facts provided in the [ALLOWED FACTS] section. Do not use any outside knowledge.
2. Never invent historical facts, dates, people, or events.
3. Never claim relationships between entities that are not present in [ALLOWED FACTS].
4. Do not modify, extend, or rewrite the knowledge graph.
5. When the facts do not cover the question, say you cannot answer from the current knowledge.
6. Keep answers concise and cite the source entity or relationship names you used.
"""


def build_grounding_section(facts: List[str]) -> str:
    if not facts:
        return "[ALLOWED FACTS]\n(none provided)\n"
    bullet = "\n".join("- %s" % f for f in facts)
    return "[ALLOWED FACTS]\n%s\n" % bullet


def build_user_prompt(question: str, facts: List[str]) -> str:
    section = build_grounding_section(facts)
    return "%s\nQuestion: %s\n" % (section, question)


class PromptService:
    """Builds system and user prompts for grounded answering."""

    def system_prompt(self) -> str:
        return SYSTEM_PROMPT

    def user_prompt(self, question: str, facts: List[str]) -> str:
        return build_user_prompt(question, facts)
