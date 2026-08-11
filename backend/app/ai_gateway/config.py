"""AI Gateway configuration.

All values come from the environment. Nothing is hard-coded and no secret is
committed. The gateway is DISABLED by default so M0-M10 behaviour is unchanged
until an operator explicitly enables it with a provider key.

Domestic-provider support (ADR-0017): AI_BASE_URL + AI_MODEL let an
OpenAI-compatible provider (DeepSeek / 通义 / 智谱) be wired in with ZERO new
dependency -- the whitelisted `openai` SDK is redirected via base_url. When
AI_BASE_URL / AI_MODEL are unset, behaviour is byte-identical to the original
OpenAI-only config.

A minimal .env loader (stdlib only, no python-dotenv dependency) reads
backend/.env so operators can keep secrets out of the process environment and
out of version control (.env is gitignored).
"""
import os


def _load_dotenv():
    """Load backend/.env into os.environ (stdlib-only, best-effort).

    Only sets variables that are NOT already present in the environment, so
    real shell exports always win over the file. A missing file is silently
    ignored. This avoids adding python-dotenv as a new dependency.
    """
    cwd = os.getcwd()
    candidates = [os.path.join(cwd, ".env")]
    # also try the project root .env (one level up from backend/)
    root_env = os.path.join(os.path.dirname(cwd), ".env")
    if root_env not in candidates:
        candidates.append(root_env)
    for f in candidates:
        if not f or not os.path.isfile(f):
            continue
        try:
            with open(f, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, _, val = line.partition("=")
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and key not in os.environ:
                        os.environ[key] = val
        except OSError:
            continue
        return  # load the first existing .env only


def _as_bool(value):
    if value is None:
        return False
    return str(value).strip().lower() in ("1", "true", "yes", "on")


class AIConfig:
    """Resolved AI Gateway configuration."""

    def __init__(self, enabled, provider, api_key, base_url=None, model=None):
        self.enabled = enabled
        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    @property
    def is_enabled(self):
        return self.enabled

    def has_credentials(self):
        return bool(self.api_key)


def get_config():
    """Build an AIConfig from environment variables only.

    `.env` loading is performed once at application startup (see app.main),
    guarded so pytest never auto-loads it — this keeps the "AI disabled by
    default when no env is set" contract verifiable and stops tests from
    accidentally constructing a real provider / hitting the network.
    """
    enabled = _as_bool(os.environ.get("AI_GATEWAY_ENABLED"))
    provider = (os.environ.get("AI_PROVIDER") or "openai").strip().lower()
    api_key = (os.environ.get("AI_API_KEY") or "").strip()
    base_url = (os.environ.get("AI_BASE_URL") or None)
    if base_url is not None:
        base_url = base_url.strip() or None
    model = (os.environ.get("AI_MODEL") or None)
    if model is not None:
        model = model.strip() or None
    return AIConfig(
        enabled=enabled,
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        model=model,
    )
