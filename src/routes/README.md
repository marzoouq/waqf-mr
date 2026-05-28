# `src/routes/` — Role-Specific Route Trees

Each file exports `<Route>` elements consumed by `src/app/router.tsx`.

## Files

- `adminRoutes.tsx` — Admin + Accountant routes (under `/dashboard/*`).
- `beneficiaryRoutes.tsx` — Beneficiary routes (under `/beneficiary/*`).
- `waqifRoutes.tsx` — Waqif (read-only public) routes.
- `publicRoutes.tsx` — Auth, landing, support, legal.
- `ProtectedRouteHelper.tsx` — `<ProtectedRoute>` wrapper used by all role trees.
- `RouteErrorBoundary.tsx` + `withRouteErrorBoundary.tsx` — error fallback per route.

## Boundary

- `src/app/` = root composition (`RouterProvider`).
- `src/routes/` = **role-specific route declarations only**. No data fetching, no business logic.
- `src/pages/` = the actual page components rendered by these routes.

Lazy-load every page via `React.lazy` to keep initial chunks small.
