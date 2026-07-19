"""Environment-based configuration for the History Explorer backend (M3-002).

The only goal here is to remove hardcoded literals (API base / CORS / version /
data dir / log level) from `main.py` and read them from the environment. No
heavy framework, no new dependency — just `os.environ` + a frozen dataclass.

Operators can override any value via environment variables (see `.env.example`):
    APP_NAME, APP_VERSION, API_V1_PREFIX, CORS_ORIGINS, DATA_DIR,
    LOG_LEVEL, ENVIRONMENT

All values fall back to the same defaults the code used before M3-002, so the
public API contract and data paths are unchanged when no env is set.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

# Single logger name for the whole backend; reused by main.py + future modules.
LOGGER_NAME = "history_explorer"


def _csv_list(value: str | None, default: list[str]) -> list[str]:
    """Parse a comma-separated env value into a stripped, non-empty list."""
    if not value:
        return list(default)
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    """Immutable application settings, populated once at process start."""

    app_name: str
    app_version: str
    api_v1_prefix: str
    cors_origins: list[str]
    data_dir: str
    log_level: str
    environment: str

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("prod", "production")

    @property
    def api_version_tag(self) -> str:
        """The short version token exposed in response headers (e.g. 'v1')."""
        return self.api_v1_prefix.strip("/").split("/")[-1] or "v1"


def get_settings() -> Settings:
    """Build `Settings` from the environment with safe defaults."""
    # Repo root (this file lives in backend/app/config.py -> repo is two
    # levels up from `app/`). The example datasets live at <repo>/data/examples.
    repo_root = Path(__file__).resolve().parent.parent.parent
    default_data_dir = str(repo_root / "data" / "examples")

    return Settings(
        app_name=os.getenv("APP_NAME", "History Explorer API"),
        app_version=os.getenv("APP_VERSION", "0.3.0"),
        api_v1_prefix=os.getenv("API_V1_PREFIX", "/api/v1").strip() or "/api/v1",
        cors_origins=_csv_list(
            os.getenv("CORS_ORIGINS"), ["http://localhost:5173"]
        ),
        data_dir=os.getenv("DATA_DIR", default_data_dir),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
        environment=os.getenv("ENVIRONMENT", "development"),
    )


def configure_logging(level: str = "INFO") -> logging.Logger:
    """Configure the standard-library logger once, with a unified format.

    Replaces the old `print()`-based startup report. Idempotent: if a handler
    is already attached to the root logger (e.g. under pytest / uvicorn), the
    existing configuration is left untouched.
    """
    numeric = getattr(logging, level.upper(), logging.INFO)
    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=numeric,
            format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        root.setLevel(min(root.level, numeric))
    return logging.getLogger(LOGGER_NAME)
