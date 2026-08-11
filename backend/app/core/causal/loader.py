"""M82 P1.2 — CausalStatement JSON Loader.

Loads CausalStatement instances from ``data/causal_statements.json`` into
an in-memory index.  The loader is intentionally minimal:

* It reads JSON and constructs frozen :class:`CausalStatement` objects.
* It builds two lookup indexes (by cause_id, by effect_id).
* It does NOT interpret, validate causal plausibility, or generate content.
* Unknown future fields in the JSON are silently ignored so that forward
  schema compatibility is maintained (see C-7 / M82 Constraint Lock).

Query-time semantics belong in ``adapter.py`` (P1.3), not here.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .model import CausalStatement


@dataclass
class CausalIndex:
    """In-memory lookup index built from loaded CausalStatements.

    Two indexes are maintained so that queries can be answered by cause
    (``by_cause``) or by effect (``by_effect``) without scanning the
    full list.
    """

    statements: List[CausalStatement] = field(default_factory=list)
    by_cause: Dict[str, List[CausalStatement]] = field(
        default_factory=lambda: defaultdict(list)
    )
    by_effect: Dict[str, List[CausalStatement]] = field(
        default_factory=lambda: defaultdict(list)
    )


class CausalLoader:
    """Read-only loader for ``causal_statements.json``.

    Usage::

        loader = CausalLoader()
        index = loader.load()                    # default path
        index = loader.load(Path("custom.json")) # custom path

    The returned :class:`CausalIndex` is immutable in the sense that its
    internal lists are not re-exported for mutation; consumers should
    treat the index as read-only.
    """

    DEFAULT_PATH: Path = (
        Path(__file__).resolve().parent.parent.parent.parent.parent
        / "data" / "causal_statements.json"
    )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def load(self, path: Optional[Path] = None) -> CausalIndex:
        """Load CausalStatements from *path* (defaults to DEFAULT_PATH).

        Returns a :class:`CausalIndex` containing all successfully parsed
        statements, indexed by cause and effect.
        """
        path = path or self.DEFAULT_PATH
        raw = self._read_json(path)
        statements = self._parse_all(raw)
        return self._build_index(statements)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _read_json(path: Path) -> list:
        """Read and decode the JSON array from *path*.

        Raises :class:`FileNotFoundError` if the file does not exist,
        and :class:`ValueError` (with chained :class:`json.JSONDecodeError`)
        when the content is not valid JSON.
        """
        if not path.exists():
            raise FileNotFoundError(f"CausalStatement file not found: {path}")
        try:
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Invalid JSON in CausalStatement file: {path}"
            ) from exc
        if not isinstance(data, list):
            raise ValueError(
                f"Expected a JSON array in {path}, got {type(data).__name__}"
            )
        return data

    @staticmethod
    def _parse_all(raw: list) -> List[CausalStatement]:
        """Convert raw dicts into :class:`CausalStatement` instances.

        Only the 7 frozen fields are extracted; any extra keys in the
        JSON objects are silently ignored so that forward-compatible
        schema extensions (M84+ fields like ``status``, ``replaces``,
        ``proposed_by``) do not break loading.
        """
        parsed: List[CausalStatement] = []
        for idx, obj in enumerate(raw):
            if not isinstance(obj, dict):
                raise ValueError(
                    f"Expected dict at index {idx}, got {type(obj).__name__}"
                )
            try:
                cs = CausalStatement(
                    cause_id=obj["cause_id"],
                    effect_id=obj["effect_id"],
                    mechanism=obj.get("mechanism"),
                    consequence=obj.get("consequence"),
                    confidence=obj.get("confidence"),
                    evidence_refs=tuple(obj.get("evidence_refs", ())),
                )
            except KeyError as exc:
                raise ValueError(
                    f"Missing required field {exc} at index {idx} (id={obj.get('id', '?' )})"
                ) from exc
            parsed.append(cs)
        return parsed

    @staticmethod
    def _build_index(statements: List[CausalStatement]) -> CausalIndex:
        """Build cause/effect indexes from the parsed statements."""
        index = CausalIndex(statements=statements)
        for cs in statements:
            index.by_cause[cs.cause_id].append(cs)
            index.by_effect[cs.effect_id].append(cs)
        return index
