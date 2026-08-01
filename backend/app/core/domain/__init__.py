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

__all__ = [
    "BaseDomainAdapter",
    "DomainAdapterInterface",
    "DomainMetadata",
    "ValidationRules",
    "AdapterRegistry",
    "HistoryAdapter",
    "DomainSchema",
]
