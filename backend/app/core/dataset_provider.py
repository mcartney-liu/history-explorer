"""Dataset Provider Layer (M25.1).

M25.1 extends the M24 Dataset identity foundation with a *Dataset Provider*
abstraction that groups dataset access behind a single, read-only facade.

Architecture decisions (M25.1 Architecture Revision Plan):
- R1 (Composition over Inheritance): `DatasetProvider` is a COMPOSITION over an
  existing `TopicRepository`. It does NOT inherit from `TopicRepository` and does
  NOT become a `DatasetRepository`. No `save_dataset()` / `publish_dataset()` /
  `switch_dataset()` exist — the provider is read-only and derived.
- R3 (No Lifecycle): the dataset manifest carries identity + provenance metadata
  ONLY. Lifecycle fields (`status` / `published_at` / `approval`) are deferred to
  M26. `DatasetManifest` therefore has exactly 9 fields and NONE are lifecycle.
- R4 (Source Loader/Schema only): `SourceRecord` is a read-only schema and
  `SourceLoader` is an interface whose M25.1 implementation returns `[]`. No
  `sources.json` is read; no AI fills sources. The real `SourceRegistry` is M26.
- R5 (Evidence Claim boundary): M25.1 defines the `Source -> Evidence Claim ->
  Entity/Relationship` boundary but does NOT create/load/validate Evidence Claims.

Reuse (no re-implementation, no new dependency):
- `compute_content_hash` and `DatasetMetadataProvider` from `dataset.py` (M24).
- `TopicRepository` / `JsonTopicRepository` from `repository.py` (M3).

Freeze constraints (unchanged):
- stdlib only, no DB / ORM / AI / LLM / new dependency.
- `main.py` is NOT modified; this provider is not wired into any runtime path.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from app.core.dataset import (
    CURATED_DATASET_ID,
    CURATED_DATASET_NAME,
    DatasetMetadataProvider,
    compute_content_hash,
)
from app.core.evidence_claim import EvidenceClaim, FileEvidenceClaimLoader
from app.core.repository import JsonTopicRepository, TopicRepository

# Default provenance + attribution metadata for the curated dataset.
# Overridable at construction time; kept explicit so the manifest is self-describing.
DEFAULT_CREATOR = "History Explorer Curators"
DEFAULT_LICENSE = "Proprietary"
PROVENANCE_POLICY = "human-curated"

# Accepted schema version tokens for M25.1. Unknown versions FAIL validation
# (see DatasetValidator). Lifecycle-bearing versions belong to M26.
MANIFEST_SCHEMA_VERSION = "1.0"
DATASET_SCHEMA_VERSION = "1.0"

# Manifest version numbers (semver-style) carried in the manifest.
MANIFEST_VERSION = "1.0.0"


@dataclass(frozen=True)
class DatasetManifest:
    """Immutable dataset descriptor (M25.1).

    Exactly 9 fields — identity + provenance metadata ONLY. Lifecycle fields
    (`status` / `published_at` / `approval`) are intentionally ABSENT; they are
    deferred to M26.
    """

    dataset_id: str
    version: str
    manifest_schema_version: str
    dataset_schema_version: str
    name: str
    creator: str
    license: str
    content_hash: str
    provenance_policy: str


@dataclass(frozen=True)
class SourceRecord:
    """Read-only schema for a provenance source (M25.1, R4).

    M25.1 does NOT load real sources — `SourceLoader` returns `[]`. This is the
    contract the future M26 `SourceRegistry` will populate.
    """

    id: str
    type: str
    title: str
    creator: str
    year: Optional[int]
    reference: str
    license: str


class SourceLoader(ABC):
    """Interface for loading provenance sources (M25.1, R4).

    M25.1 ships ONLY the empty implementation. The real source registry/loader
    is deferred to M26. Implementations MUST NOT read a `sources.json`, MUST NOT
    call any AI/LLM, and MUST NOT invent sources.
    """

    @abstractmethod
    def load(self) -> List[SourceRecord]:
        """Return the provenance sources for the dataset."""


class EmptySourceLoader(SourceLoader):
    """M25.1 source loader: returns no sources.

    Provenance sources are deferred to M26. This keeps the boundary explicit and
    prevents any accidental file read or AI-assisted source generation.
    """

    def load(self) -> List[SourceRecord]:
        return []


class DatasetProvider:
    """Read-only facade over a `TopicRepository` that derives a curated dataset.

    Composition (R1): holds a `TopicRepository` and delegates reads to it. Does
    NOT inherit from `TopicRepository`; does NOT mutate it; does NOT persist
    anything. The dataset identity is always derived from repository content via
    the canonical deterministic hash.
    """

    def __init__(
        self,
        repo: TopicRepository,
        creator: str = DEFAULT_CREATOR,
        license: str = DEFAULT_LICENSE,
        source_loader: Optional[SourceLoader] = None,
        evidence_path: Optional[Path] = None,
    ) -> None:
        self._repo = repo
        self._meta = DatasetMetadataProvider(repo)
        self._creator = creator
        self._license = license
        self._source_loader: SourceLoader = source_loader or EmptySourceLoader()
        self._evidence_path: Optional[Path] = Path(evidence_path) if evidence_path else None

    # ---- delegated reads (transparent pass-through to the repository) ----
    def list_topics(self) -> list[str]:
        return self._repo.list_topics()

    def load_topic(self, topic: str) -> Optional[dict]:
        return self._repo.load_topic(topic)

    def load_all(self) -> list[tuple[str, dict]]:
        return self._repo.load_all()

    # ---- dataset-level views ----
    def manifest(self) -> DatasetManifest:
        """Build the dataset manifest from repository content.

        `content_hash` reuses the canonical deterministic hash from M24 — no
        re-implementation, so the value is stable across M24/M25.1.
        """
        pairs = self._repo.load_all()
        content_hash = compute_content_hash(pairs)
        return DatasetManifest(
            dataset_id=CURATED_DATASET_ID,
            version=MANIFEST_VERSION,
            manifest_schema_version=MANIFEST_SCHEMA_VERSION,
            dataset_schema_version=DATASET_SCHEMA_VERSION,
            name=CURATED_DATASET_NAME,
            creator=self._creator,
            license=self._license,
            content_hash=content_hash,
            provenance_policy=PROVENANCE_POLICY,
        )

    def dataset_metadata(self):
        """Reuse the M24 `DatasetMetadataProvider` identity descriptor."""
        return self._meta.metadata()

    def load_sources(self) -> List[SourceRecord]:
        """Return provenance sources.

        M25.1 returned `[]` (R4, no source registry). M26.1 returns the curated
        sources when a `SourceLoader` is configured (e.g. `FileSourceLoader`
        reading `data/sources.json`); defaults to `[]` when none is set or the
        file is absent.
        """
        return self._source_loader.load()

    def load_evidence_claims(self) -> List[EvidenceClaim]:
        """Return human-curated Evidence Claims (M26.1).

        Loads from an independent curated file (`data/evidence_claims.json`,
        set via `evidence_path`). Returns `[]` when no file is configured or
        present. Does NOT modify `data/examples/*`; the claims are a separate
        curated layer resolved by `source_id`.
        """
        if self._evidence_path is None or not self._evidence_path.exists():
            return []
        return FileEvidenceClaimLoader(self._evidence_path).load()


def build_dataset_provider(
    data_dir: Path,
    creator: str = DEFAULT_CREATOR,
    license: str = DEFAULT_LICENSE,
    sources_path: Optional[Path] = None,
    evidence_path: Optional[Path] = None,
) -> DatasetProvider:
    """Factory: wrap a JSON topic repository in a `DatasetProvider`.

    Mirrors the `JsonTopicRepository(data_dir)` construction used by `main.py`,
    keeping the composition root consistent. Does NOT modify `main.py`.

    M26.1: defaults the curated `sources.json` / `evidence_claims.json` paths to
    the sibling of `data/examples/` (i.e. `data/`). When those files are absent,
    the loaders gracefully return `[]` — preserving M25.1 behavior until sources
    and claims are curated.
    """
    repo = JsonTopicRepository(data_dir)
    if sources_path is None:
        sources_path = Path(data_dir).parent / "sources.json"
    if evidence_path is None:
        evidence_path = Path(data_dir).parent / "evidence_claims.json"
    source_loader = None
    if Path(sources_path).exists():
        # Lazy import to avoid a circular import with `source_registry.py`.
        from app.core.source_registry import FileSourceLoader

        source_loader = FileSourceLoader(Path(sources_path))
    return DatasetProvider(
        repo,
        creator=creator,
        license=license,
        source_loader=source_loader,
        evidence_path=Path(evidence_path),
    )
