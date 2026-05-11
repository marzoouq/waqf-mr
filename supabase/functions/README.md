# Edge Functions — Security Guidelines

## Authentication Policy

Almost all Edge Functions in this project use `verify_jwt = false` in `supabase/config.toml`.
This is **intentional** — Lovable Cloud uses a signing-keys system where the default `verify_jwt = true` doesn't work. Authentication is performed manually inside each function.

**Exception:** `process-email-queue` uses `verify_jwt = true` because it is invoked exclusively by `pg_cron` via `pg_net` with a service-role JWT — there is no end-user request path, so the platform-level JWT check is sufficient and no manual `getUser()` validation is required.

### Recognized Auth Patterns (Version I-R Inventory)

The 18 Edge Functions fall into 5 legitimate categories. Do **not** force a single auth shape across all of them:

| Pattern | Functions | Notes |
|---|---|---|
| **A** — JWT-protected uniform | `beneficiary-summary`, `dashboard-summary`, `email-admin` | Candidates for `_shared/auth.ts` `authenticate()`. |
| **B** — ZATCA cluster | `zatca-onboard`, `zatca-renew`, `zatca-report`, `zatca-signer`, `zatca-xml-generator` | Migrate per-function after individual review. |
| **C** — Mixed dispatcher | `webauthn` | Keep dispatcher; use shared helpers only where uniform. |
| **D** — Public/anon by design | `guard-signup`, `lookup-national-id`, `health-check` | Bypass `_shared/auth` intentionally — must carry an inline justification comment. |
| **E** — Hybrid/special | `auth-email-hook` (HMAC webhook), `check-contract-expiry` (service-role + admin), `process-email-queue` (`verify_jwt=true` cron), `ai-assistant` (streaming body), `admin-manage-users`, `generate-invoice-pdf` | Use `_shared/auth` selectively; never break the streaming body of `ai-assistant`. |

Currently 4 functions import `_shared/auth.ts` (categories A target + parts of E). The realistic adoption ceiling is ~8 — not 15/19.


### Required Pattern for Every New Function

Every function that accesses user data or performs privileged operations **MUST** include authentication:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1. Check Authorization header
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: corsHeaders,
  });
}

// 2. Create scoped Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } }
);

// 3. Verify user (preferred: getUser for full server-side validation)
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: corsHeaders,
  });
}
```

### Authentication Methods

| Method | Use When |
|--------|----------|
| `getUser()` | **Default** — full server-side validation, returns complete user profile |
| `getClaims(token)` | Fast JWT verification when you only need `sub`, `email`, `role`, `exp` |

### Rules

1. **Use `getUser()` as default** — it validates against the server and respects RLS.
2. **`getClaims(token)`** is acceptable for lightweight checks (see [platform docs](knowledge://disable-jwt-edge-functions)).
3. **Never use `getSession()`** — it trusts the client without server verification.
4. **Never use `SUPABASE_SERVICE_ROLE_KEY`** as a fallback for user authentication.
5. **Check admin role** via `has_role(user.id, 'admin')` for privileged operations.
6. **Rate limiting** is enforced via `check_rate_limit()` for sensitive endpoints.
7. **Always include CORS headers** in responses (`corsHeaders` from `_shared/cors.ts`).

### Public Endpoints

For functions that don't require user auth (webhooks, cron, hooks):
- Validate via webhook signatures or shared secrets
- Never expose sensitive data
- Always validate and sanitize inputs

### Existing Functions

| Function | Auth | Notes |
|----------|------|-------|
| `admin-manage-users` | ✅ `getUser()` | Admin-only, role-checked |
| `ai-assistant` | ✅ `getUser()` | User-scoped |
| `guard-signup` | ⚡ Public | Signup validation, rate-limited |
| `webauthn` | ✅ `getUser()` | Credential management |
| `zatca-onboard` | ✅ `getUser()` | Onboarding & connection test |
| `zatca-report` | ✅ `getUser()` | Invoice reporting & compliance |
| `zatca-renew` | ✅ `getUser()` | Certificate renewal |
| `zatca-signer` | ✅ `getUser()` | Invoice signing |
| `zatca-xml-generator` | ✅ `getUser()` | XML generation |
| `check-contract-expiry` | ⚡ Cron | Server-initiated |
| `generate-invoice-pdf` | ✅ `getUser()` | User-scoped |
| `lookup-national-id` | ✅ `getUser()` | Rate-limited |
| `health-check` | ⚡ Public | No auth needed, DB + env checks |
| `auth-email-hook` | ⚡ Hook | Supabase-initiated |
