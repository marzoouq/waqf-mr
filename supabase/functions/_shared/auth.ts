/**
 * أدوات مصادقة مشتركة لكل Edge Functions
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AuthResult {
  user: { id: string; email?: string };
  role: string;
  userClient: ReturnType<typeof createClient>;
  adminClient: ReturnType<typeof createClient>;
}

interface AuthError {
  error: Response;
}

/**
 * مصادقة مستخدم مع التحقق من الدور وتقييد المعدل
 * @param allowedRoles - الأدوار المسموحة (فارغة = أي دور مصادق)
 * @param rateLimitKey - مفتاح تقييد المعدل
 * @param rateLimitCount - الحد الأقصى للطلبات (افتراضي 30)
 */
export async function authenticateUser(
  req: Request,
  corsHeaders: Record<string, string>,
  options: {
    allowedRoles?: string[];
    rateLimitKey?: string;
    rateLimitCount?: number;
    rateLimitWindow?: number;
  } = {}
): Promise<AuthResult | AuthError> {
  const { allowedRoles, rateLimitKey, rateLimitCount = 30, rateLimitWindow = 60 } = options;
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "يجب تسجيل الدخول" }), { status: 401, headers: jsonHeaders }) };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: new Response(JSON.stringify({ error: "جلسة غير صالحة" }), { status: 401, headers: jsonHeaders }) };
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // جلب الدور + Rate limit بالتوازي
  const promises: [Promise<unknown>, Promise<unknown>?] = [
    adminClient.from("user_roles").select("role").eq("user_id", user.id).single(),
  ];

  if (rateLimitKey) {
    promises.push(
      adminClient.rpc("check_rate_limit", {
        p_key: `${rateLimitKey}:${user.id}`,
        p_limit: rateLimitCount,
        p_window_seconds: rateLimitWindow,
      })
    );
  }

  const results = await Promise.all(promises);
  // deno-lint-ignore no-explicit-any
  const roleRes = results[0] as any;
  // deno-lint-ignore no-explicit-any
  const rlRes = results[1] as any | undefined;

  if (rlRes?.error) {
    return { error: new Response(JSON.stringify({ error: "خطأ مؤقت في الخادم" }), { status: 503, headers: jsonHeaders }) };
  }
  if (rlRes?.data === true) {
    return { error: new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى الانتظار دقيقة" }), { status: 429, headers: jsonHeaders }) };
  }

  if (!roleRes.data?.role) {
    return { error: new Response(JSON.stringify({ error: "لم يتم التعرف على صلاحياتك" }), { status: 403, headers: jsonHeaders }) };
  }

  const userRole = roleRes.data.role;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return { error: new Response(JSON.stringify({ error: "ليس لديك صلاحية لهذا الإجراء" }), { status: 403, headers: jsonHeaders }) };
  }

  return { user: { id: user.id, email: user.email }, role: userRole, userClient, adminClient };
}

/**
 * مصادقة service_role أو admin (لـ cron jobs)
 */
export function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const serviceKey = SERVICE_ROLE_KEY;

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(token);
  const bBytes = encoder.encode(serviceKey);
  const maxLen = Math.max(aBytes.byteLength, bBytes.byteLength);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  let result = aBytes.byteLength ^ bBytes.byteLength;
  for (let i = 0; i < maxLen; i++) {
    result |= aPadded[i]! ^ bPadded[i]!;
  }
  return result === 0;
}

/** فحص سريع — هل النتيجة خطأ أم بيانات */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return "error" in result;
}
