"""Minimal Dataset identity layer for curated topic data (M24 Data Foundation).

M24 is intentionally a *foundation* phase: it attaches a stable Dataset identity
(hash + metadata) to the existing curated topic datasets WITHOUT wiring it into
any runtime path, API, or new storage. This is the single source of truth for
"what is in the curated dataset right now" — derived, never stored separately.

Design invariants (M24 freeze constraints):
- No new storage layer, no Abstract Provider, no DatasetRepository.
- `DatasetMetadataProvider` is a thin COMPOSITION over an existing
  `TopicRepository` — it only reads (list_topics / load_all) and derives.
- `content_hash` is canonical & deterministic: identical logical content yields
  the same hash regardless of JSON key/array ordering in the source files.
- No mutation of the underlying repository; no new external behaviour.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

from app.core.repository import TopicRepository

# Single curated dataset identity for M24. Multi-dataset support is deferred to M25.
CURATED_DATASET_ID = "curated-history-graph"
CURATED_DATASET_NAME = "Curated History Graph"
CURATED_DATASET_DESCRIPTION = (
    "Curated multi-topic history graph derived from hand-authored example datasets. "
    "Identity is reproducible from dataset content via a canonical deterministic hash."
)


@dataclass(frozen=True)
class DatasetMetadata:
    """Immutable identity descriptor for a curated dataset snapshot."""

    dataset_id: str
    name: str
    description: str
    topics: List[str]
    content_hash: str


def _canonical(obj) -> str:
    """Recursively sort dict keys for a fully canonical JSON serialization.

    Two objects with the same logical content but different key ordering
    serialize identically, which is the basis for a deterministic content hash.
    """
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_content_hash(pairs: Sequence[Tuple[str, dict]]) -> str:
    """Canonical deterministic SHA-256 over (topic, entities, relationships, timeline).

    Determinism rules (M24 final constraint #2):
    - Topics are sorted by name so addition order does not matter.
    - Within each topic, `entities` / `relationships` / `timeline` are each sorted
      by their canonical serialization, so array order in the source JSON does not
      affect the hash.
    - Each element is serialized with sorted keys, so key order within an element
      does not matter.
    - No timestamp / random / version component is mixed in.

    Args:
        pairs: the `(topic, data)` sequence as returned by
            `TopicRepository.load_all()`. Only the `entities`, `relationships`,
            and `timeline` arrays plus the topic name contribute to the hash.
    """
    by_topic: Dict[str, dict] = {name: data for name, data in pairs}
    parts: List[str] = []
    for topic in sorted(by_topic):
        data = by_topic[topic]
        entities = sorted(_canonical(e) for e in data.get("entities", []))
        relationships = sorted(_canonical(r) for r in data.get("relationships", []))
        timeline = sorted(_canonical(t) for t in data.get("timeline", []))
        parts.append(
            _canonical(
                {
                    "topic": topic,
                    "entities": entities,
                    "relationships": relationships,
                    "timeline": timeline,
                }
            )
        )
    blob = "\n".join(parts)
    return "sha256:" + hashlib.sha256(blob.encode("utf-8")).hexdigest()


class DatasetMetadataProvider:
    """Thin, read-only composer over a `TopicRepository`.

    Produces a `DatasetMetadata` (identity) for the curated dataset. It performs
    NO storage, NO new abstraction, and NO mutation of the wrapped repository —
    it only calls `list_topics()` / `load_all()` and derives a hash from the
    returned content.
    """

    def __init__(self, repo: TopicRepository) -> None:
        self._repo = repo

    def metadata(self) -> DatasetMetadata:
        """Derive the curated dataset's identity from the repository content."""
        topics = self._repo.list_topics()
        pairs = self._repo.load_all()
        content_hash = compute_content_hash(pairs)
        return DatasetMetadata(
            dataset_id=CURATED_DATASET_ID,
            name=CURATED_DATASET_NAME,
            description=CURATED_DATASET_DESCRIPTION,
            topics=list(topics),
            content_hash=content_hash,
        )
