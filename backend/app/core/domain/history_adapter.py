"""History Adapter - M75-A.

Provides domain metadata / ontology / schema / rules for History domain.
Does NOT copy prompt_service historical prompt.
Registers History relationship via source_registry RELATIONSHIP_TYPES (M75-005 R6 allowed change).

Constraint check:
- Does NOT import Runtime TrustGate (no ai_gateway import).
- Lives outside ai_gateway/ (app/core/domain/).
- Does NOT implement SourceLoader / Acquisition Pipeline / Novel / Science.
"""
from __future__ import annotations

from .adapter import BaseDomainAdapter, DomainMetadata, ValidationRules, HISTORY_ONTOLOGY


class HistoryAdapter(BaseDomainAdapter):
    """History domain adapter for M75-A Implementation Execution."""

    def __init__(self) -> None:
        super().__init__(
            DomainMetadata(
                domain_id="history",
                label="History Explorer",
                ontology=HISTORY_ONTOLOGY,
                description=(
                    "History domain adapter for M75-A. Provides domain metadata / "
                    "ontology / schema / rules WITHOUT copying prompt_service historical prompt."
                ),
            ),
            ValidationRules(
                required_fields=["domain_id"],
                allow_empty=False,
                strict_mode=True,
            ),
        )
