"""M77-A Military History Adapter (framework-validation example).

Validates that the M76-extracted Adapter Framework supports a second domain
WITHOUT modifying the History domain or any Runtime code.

Registration scope:
- Registered ONLY inside the test scope
  (see backend/tests/test_m77_multi_domain_framework.py) via the explicit
  AdapterRegistry.register() entry point.
- NOT eagerly registered in domain/__init__.py, so it never enters the default
  production registration path. M77 validates Framework extensibility; it does
  NOT productize the Military domain.
"""
from __future__ import annotations

from .adapter import BaseDomainAdapter, DomainMetadata, ValidationRules
from .military_ontology import MILITARY_HISTORY_ONTOLOGY


class MilitaryAdapter(BaseDomainAdapter):
    """Second-domain adapter example for M77 multi-domain framework validation."""

    def __init__(self) -> None:
        super().__init__(
            DomainMetadata(
                domain_id="military",
                label="Military History (M77 example)",
                ontology=MILITARY_HISTORY_ONTOLOGY,
                description=(
                    "Minimal second-domain adapter for M77 multi-domain framework "
                    "validation. Not a production Military knowledge model."
                ),
            ),
            ValidationRules(
                required_fields=["domain_id"],
                allow_empty=False,
                strict_mode=True,
            ),
        )
