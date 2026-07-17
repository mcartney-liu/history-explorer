"""Data-quality validation for History Explorer example datasets (M2-005).

This module is a **pure library**: it takes already-loaded topic datasets
(`(topic, data)` tuples) and returns a structured `ValidationReport`. It has
no knowledge of the filesystem, the FastAPI app, or any cache — that wiring
lives in `app.main`. Keeping it pure makes it trivially unit-testable with
synthetic data and avoids an import cycle.

Design constraints (M2 freeze + 7 engineering principles):
- No AI, no DB, no ORM, no Neo4j, no new dependency — stdlib only.
- Warnings, never crashes. Missing/invalid data is *reported*, not raised.
- Additive: the validation report is surfaced read-only; existing API
  responses are untouched.
- Single responsibility: this file validates; `app.main` orchestrates.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


# --- Allowed vocabularies (from data/schemas/exploration_schema.md) --------
# Canonical entity types per the M3.5-000 Schema Freeze: 8 total (the 7 M2
# active types + additive `Idea`). Anything outside this set is *warned*, not
# rejected — the schema is additive and future types are reserved.
ENTITY_TYPES: frozenset[str] = frozenset(
    {
        "Event",
        "Person",
        "Civilization",
        "Location",
        "Time Period",
        "Technology",
        "Religion",
        "Idea",
    }
)

# Canonical relationship types per the M3.5-000 Schema Freeze: 18 total (the
# 15 inherited M1/M2 types + additive `inherited` / `conquered` / `spread`).
RELATIONSHIP_TYPES: frozenset[str] = frozenset(
    {
        "caused",
        "influenced",
        "participated_in",
        "located_at",
        "related_to",
        "before",
        "after",
        "contemporary_with",
        "part_of",
        "ruled",
        "traded_with",
        "invented",
        "discovered",
        "practiced",
        "spoke",
        "inherited",
        "conquered",
        "spread",
    }
)


@dataclass
class ValidationIssue:
    """A single validation finding.

    `severity` is "error" for data-integrity problems that break the
    exploration graph or entity identity, and "warning" for conformance /
    quality nits that the runtime tolerates.
    """

    severity: str  # "error" | "warning"
    code: str
    topic: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {
            "severity": self.severity,
            "code": self.code,
            "topic": self.topic,
            "message": self.message,
        }


@dataclass
class TopicReport:
    """Per-topic statistics + findings (M2-005 item 5)."""

    topic: str
    entity_count: int = 0
    relationship_count: int = 0
    timeline_count: int = 0
    summary: str = ""
    warning_count: int = 0
    error_count: int = 0
    issues: list[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "topic": self.topic,
            "entity_count": self.entity_count,
            "relationship_count": self.relationship_count,
            "timeline_count": self.timeline_count,
            "summary": self.summary,
            "warning_count": self.warning_count,
            "error_count": self.error_count,
            "issues": [i.to_dict() for i in self.issues],
        }


@dataclass
class ValidationReport:
    """The full aggregate report (M2-005 items 1-7)."""

    topics: list[TopicReport] = field(default_factory=list)
    issues: list[ValidationIssue] = field(default_factory=list)
    topic_count: int = 0
    entity_count: int = 0
    relationship_count: int = 0
    timeline_count: int = 0
    warning_count: int = 0
    error_count: int = 0

    @property
    def status(self) -> str:
        if self.error_count > 0:
            return "degraded"
        return "healthy"

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "health": {
                "topic_count": self.topic_count,
                "entity_count": self.entity_count,
                "relationship_count": self.relationship_count,
                "timeline_count": self.timeline_count,
                "warning_count": self.warning_count,
                "error_count": self.error_count,
            },
            "topics": [t.to_dict() for t in self.topics],
            "issues": [i.to_dict() for i in self.issues],
        }


# ---------------------------------------------------------------------------
# 1. Schema validation — shape conformance (M2-005 item 1)
# ---------------------------------------------------------------------------
def validate_entity_schema(entity: Any, topic: str) -> list[ValidationIssue]:
    """Check one entity against the BaseEntity contract.

    Identity-critical missing fields (id/type/name) are errors; softer
    conformance issues (unknown type, missing description) are warnings so the
    runtime keeps working. Never raises.
    """
    issues: list[ValidationIssue] = []
    if not isinstance(entity, dict):
        return [ValidationIssue("error", "ENTITY_NOT_OBJECT", topic,
                                "Entity is not a JSON object.")]

    eid = entity.get("id")
    if not isinstance(eid, str) or not eid:
        issues.append(ValidationIssue("error", "ENTITY_MISSING_ID", topic,
                                       "Entity is missing a non-empty `id`."))

    etype = entity.get("type")
    if not isinstance(etype, str) or not etype:
        issues.append(ValidationIssue("error", "ENTITY_MISSING_TYPE", topic,
                                       "Entity is missing a non-empty `type`."))
    elif etype not in ENTITY_TYPES:
        issues.append(ValidationIssue(
            "warning", "ENTITY_UNKNOWN_TYPE", topic,
            f"Entity `{eid}` has type `{etype}` not in the M2 active enum "
            f"{sorted(ENTITY_TYPES)}."))

    name = entity.get("name")
    if not isinstance(name, str) or not name:
        issues.append(ValidationIssue("error", "ENTITY_MISSING_NAME", topic,
                                       f"Entity `{eid}` is missing a non-empty `name`."))

    # `description` is required by the schema but the API tolerates its
    # absence (M1 minimal data), so this is a warning, not an error.
    if not entity.get("description"):
        issues.append(ValidationIssue(
            "warning", "ENTITY_MISSING_DESCRIPTION", topic,
            f"Entity `{eid}` is missing a `description`."))

    return issues


def validate_relationship_schema(rel: Any, topic: str) -> list[ValidationIssue]:
    """Check one relationship against the Relationship Model v2."""
    issues: list[ValidationIssue] = []
    if not isinstance(rel, dict):
        return [ValidationIssue("error", "RELATIONSHIP_NOT_OBJECT", topic,
                                "Relationship is not a JSON object.")]

    if not rel.get("source"):
        issues.append(ValidationIssue("error", "RELATIONSHIP_MISSING_SOURCE", topic,
                                       "Relationship is missing `source`."))
    if not rel.get("target"):
        issues.append(ValidationIssue("error", "RELATIONSHIP_MISSING_TARGET", topic,
                                       "Relationship is missing `target`."))

    rtype = rel.get("type")
    if not isinstance(rtype, str) or not rtype:
        issues.append(ValidationIssue("error", "RELATIONSHIP_MISSING_TYPE", topic,
                                       "Relationship is missing `type`."))
    elif rtype not in RELATIONSHIP_TYPES:
        issues.append(ValidationIssue(
            "warning", "RELATIONSHIP_UNKNOWN_TYPE", topic,
            f"Relationship has type `{rtype}` not in the supported set "
            f"{sorted(RELATIONSHIP_TYPES)}."))

    return issues


def validate_timeline_schema(entry: Any, topic: str, index: int) -> list[ValidationIssue]:
    """Check one timeline entry.

    Timeline entries carry `period` (string or TimeValue object) and `event`
    (string). They may optionally carry an `entity` id reference, which is
    cross-checked in `validate_cross_references`. Missing/empty fields are
    warnings — the runtime normalizes them gracefully.
    """
    issues: list[ValidationIssue] = []
    if not isinstance(entry, dict):
        return [ValidationIssue("warning", "TIMELINE_NOT_OBJECT", topic,
                                f"Timeline entry #{index} is not a JSON object.")]

    if not entry.get("event"):
        issues.append(ValidationIssue(
            "warning", "TIMELINE_MISSING_EVENT", topic,
            f"Timeline entry #{index} is missing an `event` label."))

    period = entry.get("period")
    if period is None or period == "":
        issues.append(ValidationIssue(
            "warning", "TIMELINE_MISSING_PERIOD", topic,
            f"Timeline entry #{index} has a null/empty `period`."))
    elif isinstance(period, dict) and not period.get("label") and "value" not in period:
        issues.append(ValidationIssue(
            "warning", "TIMELINE_BAD_PERIOD", topic,
            f"Timeline entry #{index} has a structured `period` without "
            f"`label` or `value`."))

    return issues


def validate_topic_schema(data: Any, topic: str) -> list[ValidationIssue]:
    """Check the top-level topic document shape."""
    issues: list[ValidationIssue] = []
    if not isinstance(data, dict):
        return [ValidationIssue("error", "TOPIC_NOT_OBJECT", topic,
                                "Topic dataset is not a JSON object.")]

    for section in ("entities", "relationships", "timeline"):
        if section not in data:
            issues.append(ValidationIssue(
                "warning", "TOPIC_MISSING_SECTION", topic,
                f"Topic is missing the `{section}` section."))
        elif not isinstance(data.get(section), list):
            issues.append(ValidationIssue(
                "warning", "TOPIC_BAD_SECTION", topic,
                f"Topic `{section}` is not a list."))
    return issues


# ---------------------------------------------------------------------------
# 2. Cross-reference validation (M2-005 item 2)
# ---------------------------------------------------------------------------
def validate_cross_references(
    topic: str,
    entities: list[dict],
    relationships: list[dict],
    timeline: list[dict],
    global_id_universe: Optional[set] = None,
) -> list[ValidationIssue]:
    """Verify that every reference resolves to a real entity in this topic.

    Relationship source/target and optional timeline `entity` references must
    point at an entity id (or global_id). Dangling references are errors
    because they break the exploration click loop.

    `global_id_universe` (optional) is the union of every global_id across all
    topics. When provided, a cross-topic reference written as `namespace:id`
    resolves if that global_id exists in ANY topic — it is a Knowledge Layer
    concern, not a dangling link. This is what lets M3-003's interconnected
    topics reference each other via global_id without tripping a false error.
    """
    issues: list[ValidationIssue] = []
    id_set = {e.get("id") for e in entities if isinstance(e, dict)}
    global_id_set = {
        e.get("global_id") for e in entities
        if isinstance(e, dict) and e.get("global_id")
    }
    # A reference resolves if it matches a local id OR a global_id (this topic
    # or any other topic, when the universe is supplied).
    resolvable = id_set | global_id_set
    if global_id_universe:
        resolvable = resolvable | global_id_universe

    for rel in relationships:
        if not isinstance(rel, dict):
            continue
        src = rel.get("source")
        tgt = rel.get("target")
        rel_type = rel.get("type", "related_to")
        if src and src not in resolvable:
            issues.append(ValidationIssue(
                "error", "RELATIONSHIP_DANGLING_SOURCE", topic,
                f"Relationship `{rel_type}` references unknown source `{src}`."))
        if tgt and tgt not in resolvable:
            issues.append(ValidationIssue(
                "error", "RELATIONSHIP_DANGLING_TARGET", topic,
                f"Relationship `{rel_type}` references unknown target `{tgt}`."))

    for i, entry in enumerate(timeline):
        if not isinstance(entry, dict):
            continue
        ref = entry.get("entity") or entry.get("entity_id")
        if ref and ref not in resolvable:
            issues.append(ValidationIssue(
                "error", "TIMELINE_UNKNOWN_ENTITY", topic,
                f"Timeline entry #{i} references unknown entity `{ref}`."))

    return issues


# ---------------------------------------------------------------------------
# 3. Duplicate detection (M2-005 item 3)
# ---------------------------------------------------------------------------
def detect_duplicates(entities: list[dict], topic: str) -> list[ValidationIssue]:
    """Detect duplicate id / global_id / alias / name within one topic."""
    issues: list[ValidationIssue] = []

    ids: dict[str, int] = {}
    global_ids: dict[str, int] = {}
    names: dict[str, int] = {}
    aliases: dict[str, int] = {}

    for ent in entities:
        if not isinstance(ent, dict):
            continue
        eid = ent.get("id")
        if eid:
            ids[eid] = ids.get(eid, 0) + 1
        gid = ent.get("global_id")
        if gid:
            global_ids[gid] = global_ids.get(gid, 0) + 1
        name = ent.get("name")
        if name:
            names[name] = names.get(name, 0) + 1
        for alias in (ent.get("aliases") or []):
            if alias:
                aliases[alias] = aliases.get(alias, 0) + 1

    for eid, count in ids.items():
        if count > 1:
            issues.append(ValidationIssue(
                "error", "DUPLICATE_ID", topic,
                f"Entity id `{eid}` appears {count} times in the topic."))
    for gid, count in global_ids.items():
        if count > 1:
            issues.append(ValidationIssue(
                "warning", "DUPLICATE_GLOBAL_ID", topic,
                f"global_id `{gid}` appears {count} times in the topic."))
    for name, count in names.items():
        if count > 1:
            issues.append(ValidationIssue(
                "warning", "DUPLICATE_NAME", topic,
                f"Entity name `{name}` appears {count} times in the topic."))
    for alias, count in aliases.items():
        if count > 1:
            issues.append(ValidationIssue(
                "warning", "DUPLICATE_ALIAS", topic,
                f"Alias `{alias}` appears on {count} entities in the topic."))

    return issues


# ---------------------------------------------------------------------------
# 4. Relationship consistency (M2-005 item 4)
# ---------------------------------------------------------------------------
def check_relationship_consistency(
    topic: str,
    entities: list[dict],
    relationships: list[dict],
) -> list[ValidationIssue]:
    """Detect orphan entities and circular references.

    - Orphan: an entity with no incoming and no outgoing relationship.
    - Circular: a directed cycle in the relationship graph (e.g. A->B->A).
    Both are reported as warnings (informational) — they are not runtime errors.
    A dangling edge is reported separately by `validate_cross_references`.
    """
    issues: list[ValidationIssue] = []
    id_set = {e.get("id") for e in entities if isinstance(e, dict) and e.get("id")}

    degree_out: dict[str, int] = {e: 0 for e in id_set}
    degree_in: dict[str, int] = {e: 0 for e in id_set}
    adj: dict[str, list[str]] = {e: [] for e in id_set}

    for rel in relationships:
        if not isinstance(rel, dict):
            continue
        src, tgt = rel.get("source"), rel.get("target")
        if src in degree_out:
            degree_out[src] += 1
            adj[src].append(tgt)
        if tgt in degree_in:
            degree_in[tgt] += 1

    for eid in id_set:
        if degree_out[eid] == 0 and degree_in[eid] == 0:
            issues.append(ValidationIssue(
                "warning", "ORPHAN_ENTITY", topic,
                f"Entity `{eid}` has no relationships (orphan)."))

    for cycle in _find_cycles(adj):
        issues.append(ValidationIssue(
            "warning", "CIRCULAR_REFERENCE", topic,
            "Circular relationship chain: " + " -> ".join(cycle)))

    return issues


def _find_cycles(adj: dict[str, list[str]]) -> list[list[str]]:
    """Return de-duplicated directed cycles as node lists (each ends where it
    starts). Best-effort: reports the cycle path, not every rotation."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color: dict[str, int] = {n: WHITE for n in adj}
    stack: list[str] = []
    raw: list[list[str]] = []

    def dfs(u: str) -> None:
        color[u] = GRAY
        stack.append(u)
        for v in adj.get(u, []):
            if color.get(v, WHITE) == GRAY:
                idx = stack.index(v)
                raw.append(stack[idx:] + [v])
            elif color.get(v, WHITE) == WHITE:
                dfs(v)
        stack.pop()
        color[u] = BLACK

    for n in list(adj.keys()):
        if color[n] == WHITE:
            dfs(n)

    # Deduplicate by the set of nodes in the cycle.
    seen: set[frozenset[str]] = set()
    unique: list[list[str]] = []
    for cyc in raw:
        key = frozenset(cyc)
        if key not in seen:
            seen.add(key)
            unique.append(cyc)
    return unique


# ---------------------------------------------------------------------------
# 5 + 6 + 7. Orchestration: per-topic report, health, developer summary
# ---------------------------------------------------------------------------
def build_validation_report(topic_datasets: list[tuple[str, dict]]) -> ValidationReport:
    """Build the full aggregate report from loaded `(topic, data)` tuples.

    `topic_datasets` is produced by the caller (e.g. main.py) so this function
    stays pure and filesystem-free. Runs every check once and aggregates.
    """
    report = ValidationReport()

    # Union of every global_id across all topics — lets `validate_cross_references`
    # accept cross-topic (`namespace:id`) references that point at another topic,
    # instead of flagging them as dangling (M3-003 interconnected topics).
    all_global_ids: set[str] = set()
    for _, data in topic_datasets:
        for ent in (data.get("entities") or []):
            if isinstance(ent, dict) and ent.get("global_id"):
                all_global_ids.add(ent["global_id"])

    for topic, data in topic_datasets:
        if not isinstance(data, dict):
            data = {}
        entities = data.get("entities") or []
        relationships = data.get("relationships") or []
        timeline = data.get("timeline") or []

        topic_issues: list[ValidationIssue] = []
        topic_issues += validate_topic_schema(data, topic)
        for ent in entities:
            topic_issues += validate_entity_schema(ent, topic)
        for rel in relationships:
            topic_issues += validate_relationship_schema(rel, topic)
        for i, entry in enumerate(timeline):
            topic_issues += validate_timeline_schema(entry, topic, i)
        topic_issues += validate_cross_references(
            topic, entities, relationships, timeline, all_global_ids)
        topic_issues += detect_duplicates(entities, topic)
        topic_issues += check_relationship_consistency(topic, entities, relationships)

        w = sum(1 for i in topic_issues if i.severity == "warning")
        e = sum(1 for i in topic_issues if i.severity == "error")
        summary = (data.get("summary") or "")[:160]

        topic_report = TopicReport(
            topic=topic,
            entity_count=len([x for x in entities if isinstance(x, dict)]),
            relationship_count=len([x for x in relationships if isinstance(x, dict)]),
            timeline_count=len([x for x in timeline if isinstance(x, dict)]),
            summary=summary,
            warning_count=w,
            error_count=e,
            issues=topic_issues,
        )
        report.topics.append(topic_report)
        report.issues += topic_issues
        report.entity_count += topic_report.entity_count
        report.relationship_count += topic_report.relationship_count
        report.timeline_count += topic_report.timeline_count

    report.topic_count = len(report.topics)
    report.warning_count = sum(1 for i in report.issues if i.severity == "warning")
    report.error_count = sum(1 for i in report.issues if i.severity == "error")
    return report


def format_developer_report(report: ValidationReport) -> str:
    """Render the startup developer report (check / Warning / Error lines)."""
    lines: list[str] = []
    lines.append("[History Explorer] Data validation summary")
    lines.append(
        f"  Topics: {report.topic_count} | Entities: {report.entity_count} | "
        f"Relationships: {report.relationship_count} | Timeline: {report.timeline_count}"
    )
    lines.append(
        f"  Warnings: {report.warning_count} | Errors: {report.error_count}"
    )

    if report.error_count == 0 and report.warning_count == 0:
        lines.append("  \u2713 All checks passed - data is clean.")
        return "\n".join(lines)

    if report.error_count > 0:
        lines.append(f"  Status: DEGRADED ({report.error_count} error(s))")
        lines.append("  -- Errors --")
        for i in report.issues:
            if i.severity == "error":
                lines.append(f"  [E] ({i.topic}) {i.code}: {i.message}")
    if report.warning_count > 0:
        lines.append("  -- Warnings --")
        for i in report.issues:
            if i.severity == "warning":
                lines.append(f"  [W] ({i.topic}) {i.code}: {i.message}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Global (cross-topic) validation (M3-001, Knowledge Layer consumption)
# ---------------------------------------------------------------------------
def build_global_validation_report(knowledge_service) -> ValidationReport:
    """Build the full validation report by *consuming* the KnowledgeService.

    The per-topic report is produced by the existing pure builder on the
    loaded datasets (identical behavior, counts and issue codes). Cross-topic
    checks are then layered on top — without rebuilding any graph structure
    here; the KnowledgeService already owns the registries and resolution.

    Keeping the per-topic builder as the base guarantees the /health contract
    (counts, status, issue codes) is byte-for-byte compatible with M2-005.
    """
    base = build_validation_report(knowledge_service.get_topic_datasets())
    cross = _validate_cross_topic(knowledge_service)
    base.issues += cross
    base.error_count += sum(1 for i in cross if i.severity == "error")
    base.warning_count += sum(1 for i in cross if i.severity == "warning")
    return base


def _validate_cross_topic(knowledge_service) -> list[ValidationIssue]:
    """Cross-topic integrity: shared global_id + cross-topic dangling refs.

    These are concerns that only exist once multiple topics are connected.
    They never overlap with the per-topic dangling checks (which only look at
    local ids), so there is no double-reporting.
    """
    issues: list[ValidationIssue] = []
    datasets = knowledge_service.get_topic_datasets()

    # 1) global_id uniqueness ACROSS topics (within a topic it is the
    #    per-topic DUPLICATE_GLOBAL_ID check).
    gid_owner: dict[str, str] = {}
    for topic, data in datasets:
        for ent in (data.get("entities") or []):
            if not isinstance(ent, dict):
                continue
            gid = ent.get("global_id")
            if not gid:
                continue
            if gid in gid_owner and gid_owner[gid] != topic:
                issues.append(ValidationIssue(
                    "warning", "GLOBAL_ID_DUPLICATE_ACROSS_TOPICS", topic,
                    f"global_id `{gid}` is shared by topics "
                    f"`{gid_owner[gid]}` and `{topic}`."))
            else:
                gid_owner[gid] = topic

    # 2) cross-topic dangling references: a relationship endpoint that is a
    #    global_id (contains ":") but resolves to no entity in any topic.
    resolvable_global: set[str] = set()
    for topic, data in datasets:
        for ent in (data.get("entities") or []):
            if isinstance(ent, dict) and ent.get("global_id"):
                resolvable_global.add(ent["global_id"])

    for topic, data in datasets:
        entities = [e for e in (data.get("entities") or []) if isinstance(e, dict)]
        for rel in (data.get("relationships") or []):
            if not isinstance(rel, dict):
                continue
            rel_type = rel.get("type", "related_to")
            for endp, label in ((rel.get("source"), "source"),
                                (rel.get("target"), "target")):
                if not endp or ":" not in endp:
                    # Local ref -> handled by the per-topic validator.
                    continue
                if endp not in resolvable_global:
                    issues.append(ValidationIssue(
                        "error", "RELATIONSHIP_CROSS_TOPIC_DANGLING", topic,
                        f"Relationship `{rel_type}` references `{endp}` "
                        f"({label}) which is not resolvable in any topic."))
    return issues
