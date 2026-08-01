"""Adapter Registry - M75-A (necessary Registry integration, outside ai_gateway Runtime).

Thin facade over adapter._ADAPTERS. Does NOT modify frozen Runtime files.
"""
from __future__ import annotations

from .adapter import _ADAPTERS, BaseDomainAdapter


class AdapterRegistry:
    """Registry facade for domain adapters. Reads module-level _ADAPTERS (no cycle)."""

    @classmethod
    def all(cls) -> Dict[str, object]:
        return dict(_ADAPTERS)

    @classmethod
    def get(cls, domain_id: str) -> object:
        return _ADAPTERS.get(domain_id)

    @classmethod
    def registered_ids(cls) -> List[str]:
        return list(_ADAPTERS.keys())

    @classmethod
    def is_registered(cls, domain_id: str) -> bool:
        return domain_id in _ADAPTERS
