# `src/hooks/application/` — Cross-Role Feature Controllers

Hooks here orchestrate features that span **multiple roles** (admin, accountant, beneficiary, waqif). They are the role-agnostic counterpart to `hooks/page/<role>/`.

## When to put a hook here

- The hook drives a feature used by **two or more roles** (e.g., global search, AI chat, install prompt, landing page).
- The hook composes lower-level `hooks/data/*` and `hooks/domain/*` for a feature controller.

## When NOT to put a hook here

- Role-specific page logic → `hooks/page/<role>/`.
- Pure Supabase queries → `hooks/data/`.
- Pure calculations → `hooks/domain/` or `utils/`.

## Boundary vs `hooks/page/`

| `hooks/application/` | `hooks/page/<role>/` |
|---|---|
| Cross-role feature controllers | Role-specific page orchestration |
| Used by multiple roles | Used by a single role |
| Example: `useGlobalSearch` | Example: `useAccountsPage` (admin) |

See `mem://technical/architecture/hooks-application-layer` for the canonical rule.
