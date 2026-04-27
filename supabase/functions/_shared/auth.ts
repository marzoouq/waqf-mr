// ═══════════════════════════════════════════════════════════════════════════════
// مصادقة موحّدة لكل Edge Functions: Bearer → getUser() → role check → rate limit
// ───────────────────────────────────────────────────────────────────────────────
// لا يجب استخدام getSession() في Edge Functions — يجب دائماً getUser().
// لا يجب استخدام SUPABASE_SERVICE_ROLE_KEY كبديل لمصادقة المستخدم.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// deno-lint-ignore no-explicit-any
export type AdminClient = SupabaseClient<any, any, any>;

export type AppRole = "admin" | "accountant" | "beneficiary" | "waqif";

export interface AuthOptions {
  /** الأدوار المسموح بها — يكفي توافق دور واحد منها. اتركها فارغة لتعطيل فحص الدور. */
  allowedRoles?: AppRole[];
  /** مفتاح rate limit (سيُلصق به user.id). اتركه فارغاً لتعطيل rate limit. */
  rateLimitKey?: string;
  /** الحد الأقصى للطلبات في النافذة (افتراضي 30). */
  rateLimit?: number;
  /** نافذة rate limit بالثواني (افتراضي 60). */
  rateLimitWindowSeconds?: number;
}

export type AuthSuccess = {
  user: { id: string; email?: string | null };
  admin: AdminClient;
};
export type AuthFailure = { error: Response };
export type AuthResult = AuthSuccess | AuthFailure;

const json = (body: unknown, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * يصادق طلب Edge Function: يتحقق من JWT، ويُرجع الدور والـ admin client أو Response خطأ.
 *
 * @example
 *   const auth = await authenticate(req, corsHeaders, {
 *     allowedRoles: ["admin", "accountant"],
 *     rateLimitKey: "pdf_gen",
 *     rateLimit: 10,
 *   });
 *   if ("error" in auth) return auth.error;
 *   const { user, admin } = auth;
 */
export async function authenticate(
  req: Request,
  corsHeaders: Record<string, string>,
  opts: AuthOptions = {},
): Promise<AuthResult> {
  const {
    allowedRoles = ["admin"],
    rateLimitKey,
    rateLimit = 30,
    rateLimitWindowSeconds = 60,
  } = opts;

  // 1) Bearer token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401, corsHeaders) };
  }

  // 2) getUser()
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: json({ error: "Unauthorized" }, 401, corsHeaders) };
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as AdminClient;

  // 3) Role + rate limit بالتوازي
  const promises: Promise<unknown>[] = [];
  let roleIdx = -1;
  let rlIdx = -1;

  if (allowedRoles.length > 0) {
    roleIdx = promises.length;
    promises.push(
      admin.from("user_roles").select("role").eq("user_id", user.id).in("role", allowedRoles),
    );
  }
  if (rateLimitKey) {
    rlIdx = promises.length;
    promises.push(
      admin.rpc("check_rate_limit", {
        p_key: `${rateLimitKey}:${user.id}`,
        p_limit: rateLimit,
        p_window_seconds: rateLimitWindowSeconds,
      }),
    );
  }

  const results = await Promise.all(promises);

  if (rlIdx >= 0) {
    const rl = results[rlIdx] as { data: boolean | null; error: unknown };
    if (rl.error) {
      console.error("auth: rate limit check failed");
      return { error: json({ error: "خطأ مؤقت في الخادم" }, 503, corsHeaders) };
    }
    if (rl.data === true) {
      return { error: json({ error: "تم تجاوز الحد المسموح من الطلبات. حاول بعد دقيقة." }, 429, corsHeaders) };
    }
  }

  if (roleIdx >= 0) {
    const roleRes = results[roleIdx] as { data: { role: string }[] | null };
    if (!roleRes.data?.length) {
      const rolesText = allowedRoles.join(" or ");
      return { error: json({ error: `Forbidden: ${rolesText} only` }, 403, corsHeaders) };
    }
  }

  return { user: { id: user.id, email: user.email }, admin };
}

/** اختصار للأدمن فقط — يحافظ على التوافق مع `authenticateAdmin` القديمة في zatca-shared. */
export function authenticateAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
  rateLimitKey: string,
): Promise<AuthResult> {
  return authenticate(req, corsHeaders, {
    allowedRoles: ["admin"],
    rateLimitKey,
    rateLimit: 30,
    rateLimitWindowSeconds: 60,
  });
}
