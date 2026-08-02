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

export type AppRole = "admin" | "accountant" | "beneficiary" | "waqif" | "support";

export interface AuthOptions {
  /** الأدوار المسموح بها — يكفي توافق دور واحد منها. اتركها فارغة لتعطيل فحص الدور. */
  allowedRoles?: AppRole[];
  /** مفتاح rate limit (سيُلصق به user.id). اتركه فارغاً لتعطيل rate limit. */
  rateLimitKey?: string;
  /** الحد الأقصى للطلبات في النافذة (افتراضي 30). */
  rateLimit?: number;
  /** نافذة rate limit بالثواني (افتراضي 60). */
  rateLimitWindowSeconds?: number;
  /** استخدم getClaims() المحلي بدلاً من getUser() (أسرع — لا round-trip شبكي). */
  useClaims?: boolean;
  /** parse JSON body بالتوازي مع المصادقة (يُرجع في AuthSuccess.body). */
  parseJsonBody?: boolean;
}

export type AuthSuccess = {
  user: { id: string; email?: string | null };
  admin: AdminClient;
  /** متاح فقط إذا parseJsonBody = true. null عند فشل parsing. */
  body?: unknown;
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
    useClaims = false,
    parseJsonBody = false,
  } = opts;

  // 1) Bearer token
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: json({ error: "Unauthorized" }, 401, corsHeaders) };
  }

  // 2) المصادقة (getClaims محلي أو getUser شبكي) — مع تحليل body بالتوازي اختياريًا
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const authPromise: Promise<{ userId: string; email: string | null } | null> = useClaims
    ? (async () => {
        const token = authHeader.replace("Bearer ", "");
        const { data, error } = await userClient.auth.getClaims(token);
        if (error || !data?.claims) return null;
        return {
          userId: data.claims.sub as string,
          email: (data.claims.email as string | undefined) ?? null,
        };
      })()
    : (async () => {
        const { data, error } = await userClient.auth.getUser();
        if (error || !data.user) return null;
        return { userId: data.user.id, email: data.user.email ?? null };
      })();

  const bodyPromise: Promise<unknown> | null = parseJsonBody
    ? req.json().catch(() => null)
    : null;

  const [authInfo, parsedBody] = await Promise.all([
    authPromise,
    bodyPromise ?? Promise.resolve(undefined),
  ]);

  if (!authInfo) {
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
      Promise.resolve(
        admin.from("user_roles").select("role").eq("user_id", authInfo.userId).in("role", allowedRoles),
      ),
    );
  }
  if (rateLimitKey) {
    rlIdx = promises.length;
    promises.push(
      Promise.resolve(
        admin.rpc("check_rate_limit", {
          p_key: `${rateLimitKey}:${authInfo.userId}`,
          p_limit: rateLimit,
          p_window_seconds: rateLimitWindowSeconds,
        }),
      ),
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

  const success: AuthSuccess = { user: { id: authInfo.userId, email: authInfo.email }, admin };
  if (parseJsonBody) success.body = parsedBody;
  return success;
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

// ═══════════════════════════════════════════════════════════════════════════════
// JWT Helpers — تُستخدم من cron jobs و process-email-queue
// ═══════════════════════════════════════════════════════════════════════════════

/** يفك ترميز ادعاءات JWT بدون تحقق التوقيع (استخدمها فقط بعد التحقق على بوابة Supabase). */
export function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * يتحقق بشكل آمن ما إذا كان token مطابقاً لمفتاح SERVICE_ROLE الحقيقي.
 * يستخدم مقارنة ثابتة الزمن (constant-time) لتفادي timing attacks.
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ لا تستخدم parseJwtClaims هنا — JWT بدون تحقق التوقيع قابل للتزوير
 *    (أي شخص يستطيع صياغة JWT بـ role=service_role).
 *    المقارنة الفعلية بالمفتاح من env هي مصدر الثقة الوحيد.
 */
export function isServiceRole(token: string): boolean {
  if (!token) return false;
  if (!SUPABASE_SERVICE_ROLE_KEY) return false;
  const a = new TextEncoder().encode(token);
  const b = new TextEncoder().encode(SUPABASE_SERVICE_ROLE_KEY);
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

