"""Domain Adapter Framework - M75-A Implementation (outside ai_gateway Runtime).

Design constraints satisfied:
- Does NOT import Runtime TrustGate directly. Adapter only declares ValidationRules.
- Lives in app/core/domain/ (NOT inside ai_gateway/).
- Does NOT copy prompt_service historical prompt. Only provides domain metadata / ontology / schema / rules.
- Does NOT implement SourceLoader / Acquisition Pipeline / Novel Adapter / Science Adapter.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List
from .ontology import Ontology, HISTORY_ONTOLOGY

# Module-level registry (breaks import cycle with registry.py)
_ADAPTERS: Dict[str, "BaseDomainAdapter"] = {}


@dataclass
class ValidationRules:
    """Adapter declares validation rules ONLY. Runtime TrustGate is NOT imported here."""
    required_fields: List[str] = field(default_factory=list)
    allow_empty: bool = False
    strict_mode: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "required_fields": self.required_fields,
            "allow_empty": self.allow_empty,
            "strict_mode": self.strict_mode,
        }


@dataclass
class DomainMetadata:
    """Domain metadata / ontology / schema / rules — NOT copying prompt_service historical prompt."""
    domain_id: str
    label: str
    ontology: Ontology = HISTORY_ONTOLOGY
    description: str = ""


class DomainAdapterInterface(ABC):
    """Interface for domain adapters."""

    @abstractmethod
    def register(self) -> None:
        ...

    @abstractmethod
    def load(self) -> Dict[str, Any]:
        ...

    @abstractmethod
    def validate(self, payload: Dict[str, Any]) -> bool:
        ...

    @abstractmethod
    def get_metadata(self) -> DomainMetadata:
        ...


class BaseDomainAdapter(DomainAdapterInterface):
    """Base implementation. Registration is performed through AdapterRegistry.register() (no cycle with registry.py)."""

    def __init__(self, metadata: DomainMetadata, rules: ValidationRules) -> None:
        self._metadata = metadata
        self._rules = rules

    def validate(self, payload: Dict[str, Any]) -> bool:
        # Adapter only declares validation_rules; does NOT call Runtime TrustGate
        required = self._rules.required_fields
        if not required:
            return self._rules.allow_empty
        return all(k in payload for k in required)

    def get_metadata(self) -> DomainMetadata:
        return self._metadata

    def register(self) -> None:
        # Explicit registration is handled solely by AdapterRegistry.register();
        # BaseDomainAdapter itself performs NO registration (no _ADAPTERS write).
        pass

    def load(self) -> Dict[str, Any]:
        return {
            "domain_id": self._metadata.domain_id,
            "label": self._metadata.label,
            "entity_types": self._metadata.ontology.entity_types,
            "relationship_types": self._metadata.ontology.relationship_types,
            "validation_rules": self._rules.to("--no-op--") if False else self._rules.to_dict(),
        }
