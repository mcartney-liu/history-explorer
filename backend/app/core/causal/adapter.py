"""M82 P1.3 — CausalStatement Adapter.

The Adapter is the **only** bridge between the Semantic Layer
(CausalStatements) and the Fact Layer (Entity/Relationship KG).  It is a
read-only query layer — it never generates, synthesises, or infers
CausalStatements (C-5 / C-6 constraints).

Every public method returns a (possibly empty) list of
:class:`CausalStatement` instances.  Callers are responsible for
fallback behaviour (C-8: when the list is empty, degrade to
Relationship Template text, never call AI).
"""
from __future__ import annotations

from typing import List, Optional, Sequence

from .loader import CausalIndex
from .model import CausalStatement

# Re-export for convenience — callers only need to import from adapter.
__all__ = ["CausalStatementAdapter"]


class CausalStatementAdapter:
    """Read-only query adapter for the CausalStatement Semantic Layer.

    Construct with a :class:`CausalIndex` (produced by
    :class:`~.loader.CausalLoader`).  The Adapter is stateless beyond
    holding a reference to the index — every call is a pure lookup.

    Usage::

        loader = CausalLoader()
        index = loader.load()
        adapter = CausalStatementAdapter(index)

        cs_list = adapter.get_for_relationship("a", "b", "preceded_by")
        cs_list = adapter.get_for_entity("china_v1:idea-keju")
        cs_list = adapter.get_for_path([edge1, edge2])
    """

    __slots__ = ("_index",)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def __init__(self, index: CausalIndex) -> None:
        self._index = index

    # ------------------------------------------------------------------
    # Public query API
    # ------------------------------------------------------------------

    def get_for_relationship(
        self, source_id: str, target_id: str, _type: Optional[str] = None
    ) -> List[CausalStatement]:
        """Return CausalStatements where *source_id* is the cause and
        *target_id* is the effect.

        The *_type* parameter is accepted for API compatibility with
        graph Edge queries but is currently unused — CausalStatements
        are indexed by Entity GID, not Relationship type.
        """
        candidates = self._index.by_cause.get(source_id, ())
        return [cs for cs in candidates if cs.effect_id == target_id]

    def get_for_entity(self, entity_id: str) -> List[CausalStatement]:
        """Return CausalStatements where *entity_id* appears as either
        cause or effect.

        This is the primary entry point for entity-page rendering:
        "What causal stories involve this Entity?"
        """
        as_cause = self._index.by_cause.get(entity_id, ())
        as_effect = self._index.by_effect.get(entity_id, ())
        # Deduplicate by identity (frozen dataclass — object identity works)
        seen_ids = set()
        result: List[CausalStatement] = []
        for cs in (*as_cause, *as_effect):
            if id(cs) not in seen_ids:
                seen_ids.add(id(cs))
                result.append(cs)
        return result

    def get_for_path(self, edges: Sequence) -> List[CausalStatement]:
        """Return CausalStatements that lie on the given graph *edges*.

        Each edge must expose ``source`` and ``target`` attributes (or
        be indexable as ``(source, target)`` for tuple compatibility).
        The optional ``type`` attribute on the edge is accepted but
        unused — CausalStatements are indexed by Entity GID only.

        The returned list preserves the order of *edges* — the first
        element corresponds to the first edge that has a matching
        CausalStatement.
        """
        result: List[CausalStatement] = []
        seen_ids = set()
        for edge in edges:
            # Duck-type: accept both graph.Edge (attrs) and plain tuples
            if isinstance(edge, (list, tuple)):
                source, target = edge[0], edge[1]
            else:
                source = getattr(edge, "source", None)
                target = getattr(edge, "target", None)
            if source is None or target is None:
                continue
            matches = self.get_for_relationship(str(source), str(target))
            for cs in matches:
                if id(cs) not in seen_ids:
                    seen_ids.add(id(cs))
                    result.append(cs)
        return result
