"""M79 Causal Layer — interpretive semantic layer for causal assertions.

M82 P1.2: JSON Loader
M82 P1.3: Read-only Query Adapter
M84: CausalObject (Semantic Object Expansion)
M85: RelatedCausalObjectRef (Semantic Relationship)
"""
from .adapter import CausalStatementAdapter
from .causal_object import CausalObject, ExplorationPathRef, RelatedCausalObjectRef
from .loader import CausalIndex, CausalLoader
from .model import CausalStatement

__all__ = [
    "CausalStatement",
    "CausalObject",
    "ExplorationPathRef",
    "RelatedCausalObjectRef",
    "CausalIndex",
    "CausalLoader",
    "CausalStatementAdapter",
]
