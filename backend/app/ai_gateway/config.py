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


# ---------------------------------------------------------------------------
# GroundingTuningConfig — SCOPHOLD ONLY (ADR-0028 Step 0-C).
#
# This is a CONFIGURATION CARRIER for the Contract vNext 1.2 §19 runtime
# tuning parameters. It is NOT tuning policy, NOT a behavioral change, and is
# NOT wired into any grounding / temporal / validator / ranking code yet.
#
# IMPORTANT:
#   * No tuning VALUE below is a Contract semantic. Contract vNext 1.2 freezes
#     NONE of these values.
#   * Where a default is filled in, it is a LEGACY COMPATIBILITY DEFAULT so the
#     structure has a concrete shape. It is NOT Contract semantics and may be
#     overridden by runtime configuration during implementation.
#   * Fields left as None have NO legacy default and MUST NOT be given an
#     invented business meaning; they are intentionally nullable / unset.
#   * Do NOT import or use this class from grounding_builder / response_validator
#     / answer_service until the corresponding implementation phase (Phase 1+).
# ---------------------------------------------------------------------------
class GroundingTuningConfig:
    """Carrier for Contract vNext 1.2 §19 runtime tuning parameters.

    All fields are optional. Nothing here changes existing behaviour; this
    class merely exists so future implementation can inject these parameters
    via runtime configuration instead of hard-coding them.
    """

    def __init__(
        self,
        # --- legacy compatibility defaults (NOT contract semantics) ---
        max_expanded_entities=25,   # LEGACY COMPATIBILITY DEFAULT — grounded_builder.py MAX_EXPANDED_ENTITIES
        temporal_half_life=500.0,   # LEGACY COMPATIBILITY DEFAULT — exploration_engine TEMPORAL_HALF_LIFE
        max_hops_hard=2,            # LEGACY COMPATIBILITY DEFAULT — current hard-coded 2-hop expansion
        approximate_expansion=False,  # LEGACY COMPATIBILITY DEFAULT — legacy expansion was exact-only
        # --- no legacy default: nullable / unset, do NOT invent semantics ---
        tol=None,                   # [T] temporal adjacency tolerance — unset
        soft_discount=None,         # [T] SOFT-tier ranking discount — unset
        facts_budget=None,          # [T] max facts admitted to prompt — unset
        min_path_score=None,        # [T] min path/relation score — unset
        layer_cap=None,             # [T] per-layer entity cap — unset
        fanout_cap=None,            # [T] per-node neighbor fanout cap — unset
        ranking_weights=None,       # [T] relevance ranking weights — unset (dict)
        marginal_stop=None,         # [T] marginal-contribution stop threshold — unset
        queue_ordering=None,        # [T] expansion queue ordering policy — unset
        focus_terms=None,           # [T] focus-term matching vocabulary — unset (list)
    ):
        self.max_expanded_entities = max_expanded_entities
        self.temporal_half_life = temporal_half_life
        self.max_hops_hard = max_hops_hard
        self.approximate_expansion = approximate_expansion
        self.tol = tol
        self.soft_discount = soft_discount
        self.facts_budget = facts_budget
        self.min_path_score = min_path_score
        self.layer_cap = layer_cap
        self.fanout_cap = fanout_cap
        self.ranking_weights = ranking_weights
        self.marginal_stop = marginal_stop
        self.queue_ordering = queue_ordering
        self.focus_terms = focus_terms

    @classmethod
    def legacy_default(cls):
        """Return a config populated with legacy-compatible defaults only.

        Intended as a temporary implementation default during migration. These
        defaults reproduce current runtime behaviour; they are NOT Contract
        semantics and MUST be replaced by explicit runtime configuration.
        """
        return cls()
