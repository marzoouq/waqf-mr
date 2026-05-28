# `src/app/` — App Root Composition

This directory contains the **root composition** of the application:

- `router.tsx` — builds the `RouterProvider`, composes role-specific route trees from `src/routes/`.
- `providers.tsx` — wraps the app in global providers (Query, Auth, Theme, Toaster).
- `root-layout.tsx` — top-level layout shell.

## Boundary

- `src/app/` = **how the app boots and is assembled**.
- `src/routes/` = **what routes each role exposes** (returns `<Route>` elements).
- `src/pages/` = **page components** (rendered by routes; logic in `hooks/page/`).

Do not place feature logic or data fetching here.
