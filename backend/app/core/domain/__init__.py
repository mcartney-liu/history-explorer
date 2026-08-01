"""Domain Adapter Framework - M75-A Implementation Execution.

Package init for app/core/domain/. Lives OUTSIDE ai_gateway/ Runtime.
Exposes adapter classes without importing frozen Runtime files.
"""
from .adapter import (
    BaseDomainAdapter,
    DomainAdapterInterface,
    DomainMetadata,
    ValidationRules,
)
from .registry import AdapterRegistry
from .history_adapter import HistoryAdapter
from .schemas import DomainSchema

# Eagerly register domain adapters on package import so AdapterRegistry.get("history")
# resolves WITHOUT any consumer (AcquisitionPipeline) involvement. Registration is a
# side-effect of BaseDomainAdapter.__init__ writing into the module-level _ADAPTERS.
_history_adapter = HistoryAdapter()

__all__ = [
    "BaseDomainAdapter",
    "DomainAdapterInterface",
    "DomainMetadata",
    "ValidationRules",
    "AdapterRegistry",
    "HistoryAdapter",
    "DomainSchema",
]
