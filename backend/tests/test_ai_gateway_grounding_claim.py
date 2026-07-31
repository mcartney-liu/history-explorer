"""M74 Phase2 — AI Grounding Claim tests (real dataset, read-only).

Covers the Phase2 Gate approved scope:
  Step 1: local-id -> global-id mapping (claim subject binding basis)
  Step 2: relationship-pair (A->B) parsing
  Step 3: GroundingBuilder ClaimGraph output
  Step 4: Evidence Selection
  Step 5: ResponseValidator claim/source double binding

Uses the REAL knowledge_service singleton (built from the frozen dataset —
43 sources / 76 claims / 145 entities). No LLM, no network: AI provider calls
are never exercised here (AI_GATEWAY_ENABLED stays false).
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import knowledge_service  # noqa: E402  (real singleton)


# ---------------------------------------------------------------------------
# Step 1 — local-id -> global-id mapping
# ---------------------------------------------------------------------------

def test_local_to_global_known_entities():
    """Real entities resolve local -> global deterministically."""
    assert knowledge_service.find_global_id("person-augustus") == "roman_empire:person-augustus"
    assert knowledge_service.find_global_id("tp-tang") == "china_v1:tp-tang"
    assert knowledge_service.find_global_id("person-ashoka") == "ancient_india:person-ashoka"


def test_local_to_global_covers_all_entity_local_ids():
    """Every entity local id in the frozen dataset resolves (145 ids)."""
    resolved = 0
    total = 0
    for _topic, data in knowledge_service.get_topic_datasets():
        for ent in data.get("entities", []):
            lid = ent.get("id")
            if not lid:
                continue
            total += 1
            if knowledge_service.find_global_id(lid):
                resolved += 1
    assert total == 145
    assert resolved == 145


def test_local_to_global_unknown_returns_none():
    """Unknown / non-string input -> None (never binds, never raises)."""
    assert knowledge_service.find_global_id("no-such-entity-xyz") is None
    assert knowledge_service.find_global_id("") is None
    assert knowledge_service.find_global_id(None) is None
    assert knowledge_service.find_global_id(123) is None
