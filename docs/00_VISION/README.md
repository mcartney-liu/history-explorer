# L1 — Product Vision Source

**Sole Source of Truth:** *History Explorer PRD v1.0* (original signed document `History_Explorer_PRD_完整版_v1.0.docx`, dated 2026-07-01).

## Source of Truth Storage

- **Original (signed, immutable):** `docs/00_VISION/original/History_Explorer_PRD_v1.0.docx`
  - This is the authoritative binary contract carried inside the repository (self-contained on clone).
  - Treat it as immutable. Never edit the copy in place; to revise the vision, produce a new signed version (see below).
- **Derived mirror:** root `PRD.md` is the **Derived Product Vision Mirror** (version-controlled markdown), kept in sync for git/Agent readability.

## Single-Source Rules

- **No dual source:** the `.docx` (original) is the only authority. `PRD.md` is a convenience mirror, not an independent source.
- **Original wins:** if `PRD.md` (mirror) and the `.docx` (original) ever diverge, the `.docx` wins. The mirror must never overwrite the source.
- **Mirror flows one way:** `docx → PRD.md`. Do not reverse the direction (never let edits to `PRD.md` propagate back into the `.docx`).
- **Vision revision protocol:** bump PRD v1.0 → v1.1 (Product Owner approval) → re-sign a new `.docx` in `docs/00_VISION/original/` → re-sync `PRD.md` to match.
