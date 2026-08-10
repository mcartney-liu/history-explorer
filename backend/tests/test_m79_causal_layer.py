"""M79 Causal Layer — Architecture Contract Tests.

These tests guard the M79 boundary defined in ADR-M79.md. They are NOT
functional causal tests (no loader / KG integration / inference) — they
prove the Causal Semantic Layer stays a *reference* model that does not
pollute the Domain Model (Ontology / DomainSchema / Global Constraint)
nor the Knowledge Graph core.

See docs/10_ARCHITECTURE/ADR-M79.md (Boundary Rules).
"""
from __future__ import annotations

import ast
import dataclasses
import os
import subprocess
import sys
from pathlib import Path

from app.core.causal import CausalStatement

BACKEND_DIR = Path(__file__).resolve().parent.parent
CAUSAL_PKG = BACKEND_DIR / "app" / "core" / "causal"

# Modules the Causal Layer must NEVER couple to (ADR-M79 Boundary Rules).
# Fully-qualified so the Causal Layer's OWN `app.core.causal.adapter` module is
# not mistaken for the forbidden `app.core.domain.adapter`.
FORBIDDEN_IMPORTS = (
    "app.core.ontology",
    "app.core.validation",
    "app.core.knowledge_service",
    "app.core.knowledge_graph",
    "app.core.acquisition",
    "app.core.schemas",
    "app.core.domain.adapter",
)


def _collect_imports(path: Path) -> list[str]:
    """Return all imported module names via AST (robust, not string grep)."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    mods: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            mods.extend(n.name for n in node.names)
        elif isinstance(node, ast.ImportFrom):
            mods.append(node.module or "")
    return mods


def _all_causal_imports() -> list[str]:
    return [m for f in CAUSAL_PKG.glob("*.py") for m in _collect_imports(f)]


# ---------------------------------------------------------------------------
# T1 — Import Contract
# ---------------------------------------------------------------------------
def test_import_contract():
    """`from app.core.causal import CausalStatement` is the stable public API."""
    assert CausalStatement is not None
    assert CausalStatement.__name__ == "CausalStatement"


# ---------------------------------------------------------------------------
# T2 — Boundary Isolation Contract (AST-based)
# ---------------------------------------------------------------------------
def test_boundary_isolation_no_forbidden_imports():
    """Causal model must not import ontology/validation/graph/pipeline/schemas/adapter."""
    imports = _all_causal_imports()
    leaked = [m for m in imports if any(fb in m for fb in FORBIDDEN_IMPORTS)]
    assert not leaked, f"Causal Layer leaks forbidden imports: {leaked}"


# ---------------------------------------------------------------------------
# T3 — Model Contract
# ---------------------------------------------------------------------------
def test_model_contract_fields_and_frozen():
    fields = {f.name for f in dataclasses.fields(CausalStatement)}
    required = {
        "cause_id",
        "effect_id",
        "mechanism",
        "consequence",
        "confidence",
        "evidence_refs",
    }
    assert required <= fields, f"missing fields: {required - fields}"
    assert CausalStatement.__dataclass_params__.frozen is True


def test_model_contract_defaults():
    cs = CausalStatement(cause_id="e1", effect_id="e2")
    assert cs.mechanism is None
    assert cs.consequence is None
    assert cs.confidence is None
    assert cs.evidence_refs == ()


# ---------------------------------------------------------------------------
# T4 — Reference Semantics Contract
# ---------------------------------------------------------------------------
def test_reference_semantics_no_entity_redefinition():
    """CausalStatement stores id *references*, never redefines Entity/Event."""
    # The Causal Layer must NEVER redefine the Domain Model carrier classes
    # (Entity / Event / Relationship / Timeline / Ontology / DomainSchema /
    # GlobalConstraint). The package legitimately grew beyond CausalStatement
    # (M82 CausalLoader/CausalIndex, M84 CausalObject, M85 RelatedCausalObjectRef)
    # so we assert the guard's INTENT, not a rigid 1-class count.
    FORBIDDEN_CAUSAL_CLASSES = {
        "Entity", "Event", "Relationship", "Timeline",
        "Ontology", "DomainSchema", "GlobalConstraint",
    }
    defined_classes = []
    for f in CAUSAL_PKG.glob("*.py"):
        tree = ast.parse(f.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                defined_classes.append(node.name)
    assert "CausalStatement" in defined_classes, (
        f"Causal package must define CausalStatement, got {defined_classes}"
    )
    leaked = FORBIDDEN_CAUSAL_CLASSES & set(defined_classes)
    assert not leaked, (
        f"Causal Layer redefines forbidden Domain Model classes: {sorted(leaked)}"
    )
    # No forbidden carrier imports (Entity/Event live in other layers).
    imports = _all_causal_imports()
    assert not any(fb in m for m in imports for fb in FORBIDDEN_IMPORTS)

    # Reference ids are plain strings, not structured entity objects.
    cs = CausalStatement(cause_id="event:abc", effect_id="event:def")
    assert isinstance(cs.cause_id, str) and isinstance(cs.effect_id, str)
    assert cs.cause_id == "event:abc" and cs.effect_id == "event:def"


# ---------------------------------------------------------------------------
# T5 — Existing Compatibility Contract
# ---------------------------------------------------------------------------
def test_existing_event_causal_expression_intact():
    """Pre-M79 event causal edges (caused/influenced/before/after) still pass.

    Run the existing M36.1 test UNMODIFIED to prove M79 did not break the
    Knowledge Graph's event causal vocabulary. test_ai_gateway.py is NOT edited.
    """
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/test_ai_gateway.py::TestM361RomanEventIntegrity::test_causal_chain_exists",
            "-q",
        ],
        cwd=str(BACKEND_DIR),
        env={**os.environ, "PYTHONPATH": str(BACKEND_DIR)},
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"Existing event causal test regressed:\n{result.stdout}\n{result.stderr}"
    )
