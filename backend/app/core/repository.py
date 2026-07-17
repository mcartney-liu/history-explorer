"""Repository abstraction for topic datasets (M3-001, Repository Layer).

The `TopicRepository` interface decouples the rest of the application from how
topic data is physically stored. `JsonTopicRepository` is the current
implementation (reads `*{topic}_example.json` from a local directory, with an
in-process cache). Future implementations (Neo4j, remote API) can be swapped in
without touching the Knowledge Layer or the API handlers — same public API.

Constraints (M2 freeze + 7 engineering principles):
- No DB, no ORM, no new dependency — stdlib only.
- Plain file reads + dict cache — no background thread, no cache library.
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


# A topic is used to build a file path, so it must be strictly constrained
# before any filesystem access. Only lowercase letters, digits, underscores
# and hyphens are allowed — this blocks path traversal (e.g. "../", ".",
# absolute segments) and keeps the generated path confined to the data dir.
TOPIC_PATTERN = re.compile(r"^[a-z0-9_-]+$")


class TopicRepository(ABC):
    """Storage-agnostic access to structured topic datasets."""

    @abstractmethod
    def list_topics(self) -> list[str]:
        """Return all available topic names (stable, deterministic order)."""

    @abstractmethod
    def load_topic(self, topic: str) -> Optional[dict]:
        """Return the parsed dataset for `topic`, or None if it does not exist.

        Implementations may cache. Returns the raw dict (entities /
        relationships / timeline / title / summary).
        """

    @abstractmethod
    def load_all(self) -> list[tuple[str, dict]]:
        """Return every `(topic, data)` pair in one shot (startup warm-up)."""


class JsonTopicRepository(TopicRepository):
    """Reads `{topic}_example.json` files from a local directory."""

    def __init__(self, data_dir: Path):
        self._data_dir = Path(data_dir)
        self._cache: dict[str, dict] = {}

    def list_topics(self) -> list[str]:
        if not self._data_dir.exists():
            return []
        topics: list[str] = []
        for p in sorted(self._data_dir.glob("*_example.json")):
            stem = p.stem  # e.g. roman_empire_example
            if stem.endswith("_example"):
                # Keep the underscore form so the returned `topic` matches the
                # `/explore/{topic}` namespace convention (the loader normalizes
                # either separator anyway).
                topics.append(stem[: -len("_example")])
        return topics

    def load_topic(self, topic: str) -> Optional[dict]:
        """Load a topic dataset, caching the parsed result.

        The first request reads the file; every later request returns the
        cached object. This removes repeated filesystem reads after startup.
        """
        if topic in self._cache:
            return self._cache[topic]
        file_path = self._data_dir / f"{topic.replace('-', '_')}_example.json"
        if not file_path.exists():
            return None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError:
            return None
        self._cache[topic] = data
        return data

    def load_all(self) -> list[tuple[str, dict]]:
        result: list[tuple[str, dict]] = []
        for topic in self.list_topics():
            data = self.load_topic(topic)
            if data is not None:
                result.append((topic, data))
        return result
