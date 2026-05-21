# `src/lib/hooks/`

Generic, app-agnostic React hook primitives with **no domain knowledge**.
They depend only on React and stable browser APIs and could be moved to a
shared package without modification.

- `useNowClock` — ticking clock for time-based UI.
- `useStableRef` — ref that mirrors the latest value for use in callbacks/effects.

Domain-specific or UI-toolkit-bound hooks live in `src/hooks/ui/` instead.
