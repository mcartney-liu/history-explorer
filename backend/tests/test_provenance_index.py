"""Tests for ProvenanceIndex (M29.1-A) — Runtime Projection Read Model.

M29.2 Test Matrix, category A (unit):
- source_id resolves to the correct `reference`.
- subject_id resolves to the correct ProvenanceRecord
  (subject_id / source_id / claim_id / reference).
- unknown subject -> [] (O(1), no error).
- deterministic: build() twice -> identical to_json().
- immutable: data/examples hash unchanged before/after build().

These tests consume only the curated DatasetProvider (which reads
`evidence_claims.json`, `sources.json`, and the immutable `data/examples/*`).
They never write to any data file, never touch the graph, and never add
confidence/score/trust/ranking/ai_generated fields (ADR-001 / ADR-006).
"""

import hashlib
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.dataset_provider import build_dataset_provider
from app.core.evidence_claim import EvidenceClaim, SUBJECT_TYPE_ENTITY
from app.core.provenance_index import ProvenanceIndex, ProvenanceRecord
from app.core.source_registry import SourceRecordV1

DATA_DIR = BACKEND_DIR.parent / "data" / "examples"
EXAMPLES_DIR = BACKEND_DIR.parent / "data" / "examples"


def _hash_examples() -> str:
    h = hashlib.sha256()
    for p in sorted(EXAMPLES_DIR.rglob("*")):
        if p.is_file():
            h.update(p.read_bytes())
    return h.hexdigest()


def _synthetic_provider():
    """Duck-typed provider returning in-memory claims + sources (no disk I/O)."""
    sources = [
        SourceRecordV1(
            id="s1", type="primary", title="T1", creator="C1",
            year=100, reference="Ref One", license="L",
        ),
        SourceRecordV1(
            id="s2", type="secondary", title="T2", creator="C2",
            year=200, reference="Ref Two", license="L",
        ),
    ]
    claims = [
        EvidenceClaim(id="ec1", subject_type=SUBJECT_TYPE_ENTITY,
                      subject_id="ent-a", source_id="s1", claim="claim A"),
        EvidenceClaim(id="ec2", subject_type=SUBJECT_TYPE_ENTITY,
                      subject_id="ent-a", source_id="s2", claim="claim B"),
        EvidenceClaim(id="ec3", subject_type=SUBJECT_TYPE_ENTITY,
                      subject_id="ent-b", source_id="s1", claim="claim C"),
        # unresolved source -> reference transparently resolved to "" (never fabricated)
        EvidenceClaim(id="ec4", subject_type=SUBJECT_TYPE_ENTITY,
                      subject_id="ent-c", source_id="ghost", claim="claim D"),
    ]

    class _FakeProvider:
        def load_evidence_claims(self):
            return list(claims)

        def load_sources(self):
            return list(sources)

    return _FakeProvider()


def test_provenance_record_has_exactly_four_fields():
    r = ProvenanceRecord(subject_id="x", source_id="s", claim_id="c", reference="r")
    assert set(r.to_dict().keys()) == {"subject_id", "source_id", "claim_id", "reference"}


def test_source_id_resolves_reference():
    idx = ProvenanceIndex().build(_synthetic_provider())
    recs = idx.resolve("ent-a")
    refs = {r.source_id: r.reference for r in recs}
    assert refs["s1"] == "Ref One"
    assert refs["s2"] == "Ref Two"


def test_claim_resolve_returns_correct_fields():
    idx = ProvenanceIndex().build(_synthetic_provider())
    recs = idx.resolve("ent-b")
    assert len(recs) == 1
    r = recs[0]
    assert r.subject_id == "ent-b"
    assert r.source_id == "s1"
    assert r.claim_id == "ec3"
    assert r.reference == "Ref One"


def test_unknown_subject_returns_empty_list():
    idx = ProvenanceIndex().build(_synthetic_provider())
    assert idx.resolve("does-not-exist") == []
    assert idx.resolve("") == []


def test_unresolved_source_reference_is_empty_not_fabricated():
    idx = ProvenanceIndex().build(_synthetic_provider())
    recs = idx.resolve("ent-c")
    assert len(recs) == 1
    assert recs[0].reference == ""


def test_deterministic_build_to_json():
    a = ProvenanceIndex().build(_synthetic_provider()).to_json()
    b = ProvenanceIndex().build(_synthetic_provider()).to_json()
    assert a == b
    # same instance rebuilt -> identical output
    idx = ProvenanceIndex().build(_synthetic_provider())
    first = idx.to_json()
    idx.build(_synthetic_provider())
    assert idx.to_json() == first


def test_immutable_examples_hash_unchanged():
    before = _hash_examples()
    ProvenanceIndex().build(build_dataset_provider(DATA_DIR))  # real curated data
    after = _hash_examples()
    assert before == after


def test_real_curated_provenance_resolves_with_four_fields():
    idx = ProvenanceIndex().build(build_dataset_provider(DATA_DIR))
    assert len(idx) > 0
    for subj in idx.subjects():
        for r in idx.resolve(subj):
            d = r.to_dict()
            assert set(d.keys()) == {"subject_id", "source_id", "claim_id", "reference"}
            assert d["subject_id"] == subj
