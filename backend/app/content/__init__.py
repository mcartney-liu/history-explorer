"""Content Configuration Layer (ADR-0021).

Externalises *display* content — the landing page capability cards' copy and
artwork — from source code into runtime data, so the product owner can iterate
on product expression without a code change / rebuild cycle.

Hard boundaries (see ADR-0021):
  - Knowledge data (entities / relationships / evidence / sources) is NOT
    managed here. That stays under the curated data pipeline.
  - No database. Plain JSON file, stdlib only.
  - No auth system. Writes are gated by the ADMIN_ENABLED environment
    variable (default OFF). Single-machine / local scope only.
  - No new dependency. json / base64 / hashlib / os from the stdlib.
"""

from .content_router import router  # noqa: F401
from .site_config import site_config_router  # noqa: F401

__all__ = ["router", "site_config_router"]
