Add `app/bootstrap/mountReact.tsx` to the ALLOWLIST in `no-forced-reload.test.tsx`.

`mountReact.tsx` injects a manual "تحديث" (refresh) button via `innerHTML` only when React root creation fails entirely — the user must click it explicitly. This is a last-rescue fallback, not an auto-reload, so it belongs alongside `main.tsx` and `ErrorBoundary.tsx` in the allowlist.

Only change:
- `src/components/pwa/__tests__/no-forced-reload.test.tsx`: append the path with a one-line justification comment.