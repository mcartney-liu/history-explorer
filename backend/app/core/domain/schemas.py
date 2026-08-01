"""Domain schemas / metadata / rules - M75-A History Adapter supplementary.

This module defines DomainSchema used by adapters. It does NOT copy prompt_service
historical prompt and does NOT import Runtime TrustGate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class DomainSchema:
    """Domain schema definition (Universal Core extension point)."""
    name: str
    version: str = "1.0"
    fields: List[str] = field(default_factory=list)
