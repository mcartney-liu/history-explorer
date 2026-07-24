"""M11 AI Gateway — grounded AI interpretation layer (additive, read-only).

This package is the ONLY location permitted by ADR-0003 / freeze-check.mjs to
host AI runtime code. It MUST remain a read-only consumer of the deterministic
engine: it never writes to the knowledge graph, navigation truth, or any
exploration state. AI is an interpretation layer; the deterministic graph is the
single source of truth.
"""
from .config import AIConfig, get_config
from .provider import AIUnavailableError, BaseProvider, OpenAIProvider, get_provider
from .prompt_service import PromptService
from .fallback_handler import get_fallback_response

__all__ = [
    "AIConfig",
    "get_config",
    "BaseProvider",
    "OpenAIProvider",
    "get_provider",
    "PromptService",
    "AIUnavailableError",
    "get_fallback_response",
]
