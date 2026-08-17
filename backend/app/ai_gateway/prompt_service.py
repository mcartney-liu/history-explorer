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
7. Answer in Simplified Chinese (简体中文) unless the user's question is written in another language.
8. The [ALLOWED FACTS] describe the entity the user is currently exploring. Keep that focal entity at the center of your answer. You MAY draw connections to its directly-related neighbors (also present in the facts) to give helpful context or cross-civilization comparison, but you MUST NOT wander to unrelated subjects that are absent from the provided facts.
9. You MUST reply in the JSON format described in the user instructions (an object with "answer" and "citations" fields). The "answer" field is a single natural-language paragraph in Simplified Chinese; do NOT nest JSON, code blocks, or markdown fences inside the "answer" string. The "citations" field lists only the source ids you actually used from [ALLOWED FACTS].
10. Fact vs interpretation: strictly separate facts taken from [ALLOWED FACTS] from your own synthesis or interpretation. Present interpretation as reasoning anchored to those facts; never present interpretation as if it were a stated fact.
11. Uncertainty: when [ALLOWED FACTS] are insufficient to answer, explicitly state that the current knowledge cannot confirm the answer. Do not fill gaps with outside knowledge or guesses.
12. Exploration hook: if your answer naturally leads toward one of the items in the [EXPLORATION CANDIDATES] section, you may mention it as a 'further exploration direction' for the user. You may ONLY reference items listed there — never invent a relationship, entity, or candidate of your own.
"""


# --- M36.0 Prompt Mode System -----------------------------------------------
# Five scenario templates. Each APPENDS a focus directive to the base
# SYSTEM_PROMPT — the ADR-0003 grounding contract above is shared verbatim by
# every mode and is never weakened or rewritten per-mode.
_MODE_DIRECTIVES = {
    "explain": (
        "Focus: give a clear, balanced explanation of the subject using only "
        "the allowed facts."
    ),
    "why_important": (
        "Focus: explain WHY the subject matters historically — its "
        "significance and legacy — using only the allowed facts."
    ),
    "why_happened": (
        "Focus: explain WHY the subject happened — causes, preconditions and "
        "driving forces — using only relationships present in the allowed "
        "facts. Never assert a cause that is not backed by an allowed fact."
    ),
    "historical_impact": (
        "Focus: explain the IMPACT and consequences of the subject — what "
        "changed afterwards — using only the allowed facts."
    ),
    "multi_civilization_view": (
        "Focus: compare how the subject connects ACROSS civilizations and "
        "regions, using cross-topic relationships (including 2-hop chains) "
        "present in the allowed facts."
    ),
    "timeline_explanation": (
        "Focus: explain the subject as a chronological sequence, ordering "
        "only the timeline facts provided. Never invent dates or periods."
    ),
}


def template_for(mode: str) -> str:
    """Return the full system prompt for a scenario mode.

    Unknown/empty modes fall back to the default 'explain' template. The
    grounding contract (SYSTEM_PROMPT) is always included unchanged.
    """
    key = (mode or "").strip().lower()
    directive = _MODE_DIRECTIVES.get(key, _MODE_DIRECTIVES["explain"])
    return "%s\n%s\n" % (SYSTEM_PROMPT, directive)


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

    def system_prompt(self, mode: str = "explain") -> str:
        """Mode-aware system prompt (M36.0). Default keeps prior behaviour
        semantics: the grounding contract always leads; unknown modes fall
        back to 'explain'."""
        return template_for(mode)

    def user_prompt(self, question: str, facts: List[str]) -> str:
        return build_user_prompt(question, facts)
