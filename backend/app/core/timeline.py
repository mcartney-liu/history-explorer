"""Timeline index for the Knowledge Layer (M3-001).

`TimelineIndex` normalizes a topic's raw timeline entries once and offers
year-based lookups. The normalized entries are exactly what the API serves
(period string + additive `date` object for v2 structured time), so the
timeline contract is unchanged. Year bucketing is provided as a real, testable
capability for future M3-004 search/visualization work — it is not speculative
graph code, it indexes data we already have.
"""

from __future__ import annotations

from .exploration import normalize_timeline


class TimelineIndex:
    def __init__(self, entries: list[dict]):
        self._raw = list(entries or [])
        self._normalized = normalize_timeline(self._raw)
        self._by_year: dict[int, list[dict]] = {}
        for e in self._normalized:
            year = self._extract_year(e)
            if year is not None:
                self._by_year.setdefault(year, []).append(e)

    @staticmethod
    def _extract_year(entry: dict) -> int | None:
        # v2 structured time is surfaced under `date` with an int `value`
        # (negative = BC). v1 string periods have no numeric year here.
        date = entry.get("date")
        if isinstance(date, dict) and isinstance(date.get("value"), int):
            return int(date["value"])
        return None

    def get_all(self) -> list[dict]:
        """All normalized timeline entries (the API shape)."""
        return self._normalized

    def get_by_year(self, year: int) -> list[dict]:
        return list(self._by_year.get(year, []))

    def get_range(self, start: int, end: int) -> list[dict]:
        result: list[dict] = []
        for y in range(start, end + 1):
            result.extend(self._by_year.get(y, []))
        return result
