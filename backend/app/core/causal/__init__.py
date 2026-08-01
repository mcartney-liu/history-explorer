"""M79 Causal Layer — interpretive semantic layer for causal assertions.

This package is intentionally minimal: it defines the reference model
(`CausalStatement`) only. Loaders, services, API endpoints and knowledge
integration are explicitly out of scope for M79 (see ADR-M79 Non Goals).
"""
from .model import CausalStatement

__all__ = ["CausalStatement"]
