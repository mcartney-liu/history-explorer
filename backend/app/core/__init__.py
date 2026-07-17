"""Knowledge Core package for History Explorer (M3-001, Architecture First).

Layered architecture (no feature change, no public API change, no frontend
change, no new dependency):

    REST API (app.main)
        -> KnowledgeService        (facade, no God-Service logic)
            -> Knowledge Layer      (registry / graph / search / timeline / exploration)
                -> Repository Layer (TopicRepository)
                    -> JSON files

The API handlers only *project* results; all data access, indexing, graph and
traversal live in this package. See docs/M3-001_Architecture.md for details.
"""

from .repository import TopicRepository, JsonTopicRepository, TOPIC_PATTERN
from .registry import KnowledgeRegistry, EntityRef
from .graph import DirectedGraph, Edge, KnowledgeGraph
from .search import SearchProvider, build_search_index
from .timeline import TimelineIndex
from .exploration import normalize_timeline, build_exploration_view, build_exploration_response
from .knowledge_service import KnowledgeService

__all__ = [
    "TopicRepository", "JsonTopicRepository", "TOPIC_PATTERN",
    "KnowledgeRegistry", "EntityRef",
    "DirectedGraph", "Edge", "KnowledgeGraph",
    "SearchProvider", "build_search_index",
    "TimelineIndex",
    "normalize_timeline", "build_exploration_view", "build_exploration_response",
    "KnowledgeService",
]
