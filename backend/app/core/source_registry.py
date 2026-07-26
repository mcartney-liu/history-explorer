"""Source Registry (M26.1).

Human-curated provenance source registry. Sources live in an independent
curated file `data/sources.json` (NOT in `data/examples/*`, which stays frozen).
Sources are referenced by `source_id` from Evidence Claims. They do NOT enter
the knowledge graph (no CITED_FROM relation is added; RELATIONSHIP_TYPES=18 is
unchanged) — this follows the M26 Architecture Plan, Option A: an *independent*
source entity referenced by id, never a graph node.

Freeze constraints (unchanged from M25.1):
- stdlib only; no AI / LLM / DB / ORM / new dependency.
- `Source` is an independent entity referenced by id; never a graph node.
- AI generation of sources / citations / confidence is FORBIDDEN.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from app.core.dataset_provider import SourceLoader, SourceRecord

SOURCE_SCHEMA_VERSION = "1.0"

# Controlled vocabulary for `SourceRecordV1.type`. Human-curated; not exhaustive.
SOURCE_TYPES = frozenset(
    {"primary", "secondary", "archival", "literature", "inscription", "oral", "other"}
)


@dataclass(frozen=True)
class SourceRecordV1(SourceRecord):
    """Extended, human-curated source record (M26.1 schema v1).

    Extends the M25.1 `SourceRecord` base with `publisher_or_archive`. `id` is a
    stable primary key; `reference` is a resolvable citation string; `type` is
    from a controlled vocabulary. All fields are human-curated — no AI
    generation, no automatic confidence.
    """

    publisher_or_archive: Optional[str] = None


class FileSourceLoader(SourceLoader):
    """Load human-curated sources from a curated JSON file (M26.1).

    Replaces M25.1's `EmptySourceLoader` as the configured loader. Reads
    `data/sources.json` (or any path). If the file is absent, returns `[]`
    (graceful — preserves M25.1 behavior until sources are curated). Never
    calls AI/LLM; never invents sources.
    """

    def __init__(self, path: Path) -> None:
        self._path = Path(path)

    def load(self) -> List[SourceRecord]:
        if not self._path.exists():
            return []
        raw = json.loads(self._path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("sources", [])
        out: List[SourceRecord] = []
        for item in items:
            record = _to_source_record(item)
            if record is not None:
                out.append(record)
        return out


class SourceRegistry:
    """Read-only registry over curated sources, indexed by `id`.

    Provides O(1) lookup for Evidence-Claim resolution. Does NOT mutate the
    underlying file; does NOT write anything.
    """

    def __init__(self, sources: List[SourceRecord]) -> None:
        self._by_id: Dict[str, SourceRecord] = {s.id: s for s in sources}

    @classmethod
    def from_loader(cls, loader: SourceLoader) -> "SourceRegistry":
        return cls(loader.load())

    def get(self, source_id: str) -> Optional[SourceRecord]:
        return self._by_id.get(source_id)

    def all(self) -> List[SourceRecord]:
        return list(self._by_id.values())

    def ids(self):
        return set(self._by_id.keys())

    def __len__(self) -> int:
        return len(self._by_id)


def _to_source_record(item) -> Optional[SourceRecord]:
    """Coerce a raw dict into a `SourceRecordV1`. Returns None on missing id."""
    if not isinstance(item, dict):
        return None
    source_id = item.get("id")
    if not source_id:
        return None
    year = item.get("year")
    if year is not None:
        try:
            year = int(year)
        except (TypeError, ValueError):
            year = None
    return SourceRecordV1(
        id=str(source_id),
        type=str(item.get("type", "other")),
        title=str(item.get("title", "")),
        creator=str(item.get("creator", "")),
        year=year,
        reference=str(item.get("reference", "")),
        license=str(item.get("license", "Proprietary")),
        publisher_or_archive=item.get("publisher_or_archive"),
    )
