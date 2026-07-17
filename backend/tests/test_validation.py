import sys
from pathlib import Path

# Make the `app` package importable when pytest is launched from the repo
# root or the backend directory.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient

from app.main import app
from app.validation import build_validation_report


def _ds(topic, entities=None, relationships=None, timeline=None, **extra):
    """Build a minimal `(topic, data)` tuple for pure unit tests."""
    data = {"entities": entities or [], "relationships": relationships or [],
            "timeline": timeline or []}
    data.update(extra)
    return (topic, data)


def _entity(eid, name="Name", etype="Person", description="desc"):
    return {"id": eid, "type": etype, "name": name, "description": description}


# ---------------------------------------------------------------------------
# 1. Schema Tests
# ---------------------------------------------------------------------------
def test_valid_entity_has_no_issues():
    # Two connected entities -> no schema issues, no orphan, no errors.
    report = build_validation_report([_ds(
        "t",
        entities=[_entity("a", "A"), _entity("b", "B")],
        relationships=[{"source": "a", "target": "b", "type": "related_to"}])])
    assert report.error_count == 0
    assert report.warning_count == 0
    assert not any(i.code.startswith("ENTITY_") for i in report.issues)


def test_entity_missing_required_fields_errors():
    bad = {"type": "Person", "name": "NoId"}  # missing id + description
    bad2 = {"id": "x", "name": "NoType"}       # missing type
    bad3 = {"id": "y", "type": "Person"}        # missing name
    report = build_validation_report([_ds("t", entities=[bad, bad2, bad3])])
    codes = {i.code for i in report.issues}
    assert "ENTITY_MISSING_ID" in codes
    assert "ENTITY_MISSING_TYPE" in codes
    assert "ENTITY_MISSING_NAME" in codes
    # All three are errors (identity-critical).
    assert all(i.severity == "error" for i in report.issues
               if i.code in ("ENTITY_MISSING_ID", "ENTITY_MISSING_TYPE",
                             "ENTITY_MISSING_NAME"))


def test_entity_unknown_type_is_warning():
    ent = _entity("a", etype="MythicalBeing")
    report = build_validation_report([_ds("t", entities=[ent])])
    warns = [i for i in report.issues if i.code == "ENTITY_UNKNOWN_TYPE"]
    assert len(warns) == 1 and warns[0].severity == "warning"


def test_entity_missing_description_is_warning():
    ent = {"id": "a", "type": "Person", "name": "A"}  # no description
    report = build_validation_report([_ds("t", entities=[ent])])
    warns = [i for i in report.issues if i.code == "ENTITY_MISSING_DESCRIPTION"]
    assert len(warns) == 1 and warns[0].severity == "warning"


def test_relationship_unknown_type_is_warning():
    rel = {"source": "a", "target": "b", "type": "time_travel"}
    report = build_validation_report([_ds(
        "t", entities=[_entity("a"), _entity("b")], relationships=[rel])])
    warns = [i for i in report.issues if i.code == "RELATIONSHIP_UNKNOWN_TYPE"]
    assert len(warns) == 1 and warns[0].severity == "warning"


def test_timeline_missing_fields_are_warnings():
    tl = [{"period": {"label": "x"}}, {"event": "Only event"}]  # missing event / period
    report = build_validation_report([_ds("t", timeline=tl)])
    codes = {i.code for i in report.issues}
    assert "TIMELINE_MISSING_EVENT" in codes
    assert "TIMELINE_MISSING_PERIOD" in codes


def test_topic_missing_section_is_warning():
    report = build_validation_report([("t", {"entities": []})])  # no relationships/timeline
    codes = {i.code for i in report.issues}
    assert "TOPIC_MISSING_SECTION" in codes


# ---------------------------------------------------------------------------
# 2. Duplicate Tests
# ---------------------------------------------------------------------------
def test_duplicate_id_is_error():
    report = build_validation_report([_ds(
        "t", entities=[_entity("a", "A"), _entity("a", "B")])])
    errs = [i for i in report.issues if i.code == "DUPLICATE_ID"]
    assert len(errs) == 1 and errs[0].severity == "error"


def test_duplicate_global_id_is_warning():
    e1 = _entity("a"); e1["global_id"] = "t:a"
    e2 = _entity("b"); e2["global_id"] = "t:a"
    report = build_validation_report([_ds("t", entities=[e1, e2])])
    warns = [i for i in report.issues if i.code == "DUPLICATE_GLOBAL_ID"]
    assert len(warns) == 1 and warns[0].severity == "warning"


def test_duplicate_name_is_warning():
    report = build_validation_report([_ds(
        "t", entities=[_entity("a", "Same"), _entity("b", "Same")])])
    warns = [i for i in report.issues if i.code == "DUPLICATE_NAME"]
    assert len(warns) == 1 and warns[0].severity == "warning"


def test_duplicate_alias_is_warning():
    e1 = _entity("a"); e1["aliases"] = ["Dup"]
    e2 = _entity("b"); e2["aliases"] = ["Dup"]
    report = build_validation_report([_ds("t", entities=[e1, e2])])
    warns = [i for i in report.issues if i.code == "DUPLICATE_ALIAS"]
    assert len(warns) == 1 and warns[0].severity == "warning"


# ---------------------------------------------------------------------------
# 3. Broken Reference Tests
# ---------------------------------------------------------------------------
def test_dangling_relationship_source_error():
    rel = {"source": "ghost", "target": "a", "type": "related_to"}
    report = build_validation_report([_ds(
        "t", entities=[_entity("a")], relationships=[rel])])
    errs = [i for i in report.issues if i.code == "RELATIONSHIP_DANGLING_SOURCE"]
    assert len(errs) == 1 and errs[0].severity == "error"


def test_dangling_relationship_target_error():
    rel = {"source": "a", "target": "ghost", "type": "related_to"}
    report = build_validation_report([_ds(
        "t", entities=[_entity("a")], relationships=[rel])])
    errs = [i for i in report.issues if i.code == "RELATIONSHIP_DANGLING_TARGET"]
    assert len(errs) == 1 and errs[0].severity == "error"


def test_timeline_unknown_entity_error():
    tl = [{"event": "X", "period": "1 CE", "entity": "ghost"}]
    report = build_validation_report([_ds("t", timeline=tl)])
    errs = [i for i in report.issues if i.code == "TIMELINE_UNKNOWN_ENTITY"]
    assert len(errs) == 1 and errs[0].severity == "error"


def test_global_id_reference_resolves():
    # A relationship may reference a global_id; it must NOT be flagged dangling.
    e1 = _entity("a"); e1["global_id"] = "t:a"
    rel = {"source": "t:a", "target": "b", "type": "related_to"}
    report = build_validation_report([_ds(
        "t", entities=[e1, _entity("b")], relationships=[rel])])
    errs = [i for i in report.issues if i.code.startswith("RELATIONSHIP_DANGLING")]
    assert errs == []


# ---------------------------------------------------------------------------
# 4. Relationship Consistency Tests
# ---------------------------------------------------------------------------
def test_orphan_entity_is_warning():
    # c has no relationships at all.
    report = build_validation_report([_ds(
        "t",
        entities=[_entity("a"), _entity("b"), _entity("c")],
        relationships=[{"source": "a", "target": "b", "type": "influenced"}])])
    warns = [i for i in report.issues if i.code == "ORPHAN_ENTITY"]
    assert len(warns) == 1 and "`c`" in warns[0].message


def test_circular_reference_is_warning():
    report = build_validation_report([_ds(
        "t",
        entities=[_entity("a"), _entity("b")],
        relationships=[
            {"source": "a", "target": "b", "type": "influenced"},
            {"source": "b", "target": "a", "type": "influenced"},
        ])])
    warns = [i for i in report.issues if i.code == "CIRCULAR_REFERENCE"]
    assert len(warns) >= 1


def test_incoming_outgoing_reflected():
    # Both endpoints of one edge should be reachable (degree bookkeeping works).
    report = build_validation_report([_ds(
        "t",
        entities=[_entity("a", "A"), _entity("b", "B")],
        relationships=[{"source": "a", "target": "b", "type": "related_to"}])])
    # No orphan (both have degree >= 1), no dangling, no error.
    assert report.error_count == 0
    assert not any(i.code in ("ORPHAN_ENTITY", "RELATIONSHIP_DANGLING_SOURCE",
                              "RELATIONSHIP_DANGLING_TARGET") for i in report.issues)


# ---------------------------------------------------------------------------
# 5. Health Report Tests
# ---------------------------------------------------------------------------
def test_build_report_aggregates_counts():
    ds = [
        _ds("alpha",
            entities=[_entity("a"), _entity("b")],
            relationships=[{"source": "a", "target": "b", "type": "related_to"}],
            timeline=[{"event": "E1", "period": "1 CE"}]),
        _ds("beta",
            entities=[_entity("c")],
            relationships=[],
            timeline=[]),
    ]
    report = build_validation_report(ds)
    assert report.topic_count == 2
    assert report.entity_count == 3
    assert report.relationship_count == 1
    assert report.timeline_count == 1
    assert report.status == "healthy"
    # Per-topic reports carry counts.
    by_topic = {t.topic: t for t in report.topics}
    assert by_topic["alpha"].entity_count == 2
    assert by_topic["alpha"].relationship_count == 1
    assert by_topic["beta"].entity_count == 1


def test_build_report_never_crashes_on_malformed_data():
    # Malformed / empty inputs are reported, not raised.
    report = build_validation_report([
        ("empty", {}),
        ("broken", {"entities": "not-a-list", "relationships": None}),
    ])
    assert report.topic_count == 2
    assert report.error_count > 0  # TOPIC_BAD_SECTION etc.
    assert report.status == "degraded"


def test_health_endpoint_returns_real_data_summary():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    # M3.5: 4 interconnected topics, 32 entities, 45 relationships, 7 timeline.
    assert body["health"]["topic_count"] == 4
    assert body["health"]["entity_count"] == 32
    assert body["health"]["relationship_count"] == 45
    assert body["health"]["timeline_count"] == 7
    # Interconnected dataset: no integrity errors, no quality warnings -> healthy.
    assert body["health"]["error_count"] == 0
    assert body["health"]["warning_count"] == 0
    assert body["status"] == "healthy"
    # The two legacy M2 warnings were resolved in M3-003.
    codes = {i["code"] for i in body["issues"]}
    assert "DUPLICATE_ALIAS" not in codes
    assert "ORPHAN_ENTITY" not in codes


def test_health_endpoint_structure_has_topics():
    client = TestClient(app)
    body = client.get("/health").json()
    assert len(body["topics"]) == 4
    for t in body["topics"]:
        for key in ("topic", "entity_count", "relationship_count",
                    "timeline_count", "summary", "warning_count", "error_count"):
            assert key in t
