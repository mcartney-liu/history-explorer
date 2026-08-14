// Single source of truth for the History Explorer backend API base URL.
//
// WHY this file exists: previously every data module re-declared
//   const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
// which caused port drift — EntityRelatedList.tsx and TopicExploreStarters.tsx
// accidentally hardcoded `8001`, producing "can't reach backend / research
// library empty" class bugs (same root-cause family as M74 QuickStart 400).
// Centralizing here removes the drift: one env var drives every request.
//
// TRAILING SLASH is normalized away so callers can safely write
// `${API_BASE}/path` regardless of how VITE_API_BASE is supplied.
const RAW_API_BASE: string | undefined = import.meta.env.VITE_API_BASE

export const API_BASE: string = RAW_API_BASE
  ? RAW_API_BASE.replace(/\/+$/, '')
  : 'http://localhost:8000'
