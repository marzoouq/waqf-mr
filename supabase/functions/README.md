# Edge Functions — Security Guidelines

## Authentication Policy

All Edge Functions in this project use `verify_jwt = false` in `supabase/config.toml`.
This is an intentional architectural decision — **JWT verification is performed manually inside each function**.

### Required Pattern for Every New Function

Every function that accesses user data or performs privileged operations **MUST** include:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```

### Rules

1. **Always use `getUser()`** — never `getSession()` or JWT claims alone.
2. **Never use `SUPABASE_SERVICE_ROLE_KEY`** as a fallback for user authentication.
3. **Check admin role** via `has_role(user.id, 'admin')` for privileged operations.
4. **Rate limiting** is enforced via `check_rate_limit()` for sensitive endpoints.

### Existing Functions

| Function | Auth | Notes |
|----------|------|-------|
| `admin-manage-users` | ✅ Manual | Admin-only, role-checked |
| `ai-assistant` | ✅ Manual | User-scoped |
| `guard-signup` | ⚡ Public | Signup validation only |
| `webauthn` | ✅ Manual | Credential management |
| `zatca-api` | ✅ Manual | Tax integration |
| `zatca-signer` | ✅ Manual | Invoice signing |
| `zatca-xml-generator` | ✅ Manual | XML generation |
| `check-contract-expiry` | ⚡ Cron | Server-initiated |
| `generate-invoice-pdf` | ✅ Manual | User-scoped |
| `lookup-national-id` | ✅ Manual | Rate-limited |
| `auth-email-hook` | ⚡ Hook | Supabase-initiated |
