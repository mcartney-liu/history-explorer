"""M86.2 — Exploration Package integrity regression tests.

These tests guard the CURATED exploration package layer
(`data/exploration_packages.json`) against silent data rot:

  * every `relationship_paths[].from` / `.to` resolves to a real
    entity (package entity_references / timeline_slices, OR any
    topic's global_id in data/examples)
  * every `relationship_paths[].evidence` resolves to a real
    evidence id (evidence_claims.json `ec-*` OR causal_statements.json
    `cs-*`)

This closes the gap flagged in the PLATFORM_DIAGNOSIS (P0 — exploration
packages had 118+ relationship_paths references with ZERO CI coverage
for dangling / orphan ids). It mirrors the dangling-reference discipline
already applied to the KG layer in test_data_breadth.py.

Run with: pytest backend/tests/test_exploration_package_integrity.py
"""
from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
EXAMPLES_DIR = DATA_DIR / "examples"


def _load_json(name: str):
    path = DATA_DIR / name
    assert path.exists(), f"{path} not found"
    return json.loads(path.read_text(encoding="utf-8"))


def _load_examples():
    out: list[dict] = []
    if EXAMPLES_DIR.is_dir():
        for p in sorted(EXAMPLES_DIR.glob("*_example.json")):
            out.append(json.loads(p.read_text(encoding="utf-8")))
    return out


def _build_entity_universe() -> set[str]:
    """All resolvable entity ids across packages + topic examples."""
    universe: set[str] = set()

    # Exploration package declared entities.
    pkg = _load_json("exploration_packages.json")
    for package in pkg.get("packages", []):
        universe.update(package.get("entity_references", []))
        for slice_ in package.get("timeline_slices", []):
            if slice_.get("entity"):
                universe.add(slice_["entity"])

    # Topic example global ids.
    for example in _load_examples():
        for entity in example.get("entities", []):
            gid = entity.get("global_id")
            if gid:
                universe.add(gid)

    return universe


def _build_evidence_universe() -> set[str]:
    """All resolvable evidence ids (ec-* from claims, cs-* from statements)."""
    universe: set[str] = set()

    claims = _load_json("evidence_claims.json")
    for item in claims:
        if item.get("id"):
            universe.add(item["id"])

    statements = _load_json("causal_statements.json")
    for item in statements:
        if item.get("id"):
            universe.add(item["id"])

    return universe


def test_package_relationship_endpoints_resolve():
    """Every relationship_paths from/to must resolve to a real entity."""
    pkg = _load_json("exploration_packages.json")
    universe = _build_entity_universe()

    dangling = []
    for package in pkg.get("packages", []):
        slug = package.get("slug", "?")
        for path in package.get("relationship_paths", []):
            frm = path.get("from")
            to = path.get("to")
            if frm and frm not in universe:
                dangling.append((slug, "from", frm))
            if to and to not in universe:
                dangling.append((slug, "to", to))

    assert not dangling, f"Dangling package relationship endpoints: {dangling}"


def test_package_relationship_evidence_resolves():
    """Every relationship_paths evidence must resolve to a real evidence id."""
    pkg = _load_json("exploration_packages.json")
    universe = _build_evidence_universe()

    dangling = []
    for package in pkg.get("packages", []):
        slug = package.get("slug", "?")
        for path in package.get("relationship_paths", []):
            for ev in path.get("evidence", []):
                if ev not in universe:
                    dangling.append((slug, ev))

    assert not dangling, f"Dangling package relationship evidence: {dangling}"


def test_package_timeline_entities_resolve():
    """Every timeline_slices entity must resolve to a real entity."""
    pkg = _load_json("exploration_packages.json")
    universe = _build_entity_universe()

    dangling = []
    for package in pkg.get("packages", []):
        slug = package.get("slug", "?")
        for slice_ in package.get("timeline_slices", []):
            ent = slice_.get("entity")
            if ent and ent not in universe:
                dangling.append((slug, ent))

    assert not dangling, f"Dangling package timeline entities: {dangling}"


def test_package_recommended_refs_resolve():
    """Every recommended_next_exploration entity ref must resolve to a real entity."""
    pkg = _load_json("exploration_packages.json")
    universe = _build_entity_universe()

    dangling = []
    for package in pkg.get("packages", []):
        slug = package.get("slug", "?")
        for rec in package.get("recommended_next_exploration", []):
            if rec.get("kind") == "entity":
                ref = rec.get("ref")
                if ref and ref not in universe:
                    dangling.append((slug, ref))

    assert not dangling, f"Dangling package recommended refs: {dangling}"
