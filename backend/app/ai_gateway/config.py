"""AI Gateway configuration.

All values come from the environment. Nothing is hard-coded and no secret is
committed. The gateway is DISABLED by default so M0-M10 behaviour is unchanged
until an operator explicitly enables it with a provider key.
"""
import os


def _as_bool(value):
    if value is None:
        return False
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class AIConfig:
    """Resolved AI Gateway configuration."""

    def __init__(self, enabled, provider, api_key):
        self.enabled = enabled
        self.provider = provider
        self.api_key = api_key

    @property
    def is_enabled(self):
        return self.enabled

    def has_credentials(self):
        return bool(self.api_key)


def get_config():
    """Build an AIConfig from environment variables."""
    enabled = _as_bool(os.environ.get("AI_GATEWAY_ENABLED"))
    provider = (os.environ.get("AI_PROVIDER") or "openai").strip().lower()
    api_key = (os.environ.get("AI_API_KEY") or "").strip()
    return AIConfig(enabled=enabled, provider=provider, api_key=api_key)
