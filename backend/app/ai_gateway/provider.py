"""Provider abstraction for the AI Gateway.

Design invariants (ADR-0003):
- BaseProvider defines the contract and binds to no business logic.
- OpenAIProvider is the only approved adapter (the openai SDK is whitelisted by
  the Freeze Revision Gate). Other providers can be added later behind a new ADR.
- The openai SDK is imported LAZILY so this module imports even when the SDK is
  not installed, and so a missing key / missing SDK degrades to the deterministic
  fallback instead of crashing the M0-M10 experience.
"""
from .config import AIConfig, get_config


class AIUnavailableError(Exception):
    """Raised when no usable provider can be constructed."""


class BaseProvider:
    """Contract for an AI provider adapter."""

    name = "base"

    def complete(self, system_prompt, user_prompt, max_tokens=512):
        raise NotImplementedError


class OpenAIProvider(BaseProvider):
    """Approved adapter for the OpenAI Chat Completions API.

    ADR-0017: accepts an optional `base_url` so an OpenAI-compatible domestic
    provider (DeepSeek / 通义 / 智谱) can be wired in by redirecting the
    whitelisted `openai` SDK -- ZERO new dependency. `model` is configurable so
    the provider's model name (e.g. deepseek-chat) can be selected. When
    base_url / model are None, behaviour is identical to the original OpenAI
    default (gpt-4o-mini against api.openai.com).
    """

    name = "openai"

    def __init__(self, api_key, model="gpt-4o-mini", base_url=None):
        self._api_key = api_key
        self._model = model
        self._base_url = base_url
        try:
            import openai  # lazy import: SDK not required at import time
        except ImportError as exc:
            raise AIUnavailableError("openai SDK not installed: %s" % exc) from exc
        client_kwargs = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        self._client = openai.OpenAI(**client_kwargs)

    def complete(self, system_prompt, user_prompt, max_tokens=512):
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=0.0,
        )
        return resp.choices[0].message.content or ""


_PROVIDERS = {"openai": OpenAIProvider}


def get_provider(config=None):
    """Return a ready provider, or None when AI is disabled / unconfigured.

    Returns None (never raises) so callers fall back to deterministic content
    without crashing the deterministic stack.
    """
    cfg = config or get_config()
    if not cfg.is_enabled:
        return None
    if not cfg.has_credentials():
        return None
    factory = _PROVIDERS.get(cfg.provider)
    if factory is None:
        return None
    try:
        return factory(
            api_key=cfg.api_key,
            model=cfg.model or "gpt-4o-mini",
            base_url=cfg.base_url,
        )
    except AIUnavailableError:
        return None
