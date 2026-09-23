/**
 * client-context — يُرجع عنوان IP للزائر وحالة الحجب.
 *
 * تستدعيها الواجهة عند الإقلاع (src/lib/monitoring/clientContext.ts) لإرفاق
 * عنوان IP بسجلات الوصول، ولمنع الاستخدام من عنوان محجوب عبر IpBlockGuard.
 * لا تتطلب مصادقة — الحجب يجب أن يعمل قبل تسجيل الدخول أيضاً.
 */
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";
import { extractClientIp } from "../_shared/client-ip.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const ip = extractClientIp(req);
  if (!ip) return json({ ip: null, blocked: false, reason: null });

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await client.rpc("is_ip_blocked", { p_ip: ip });
    if (error) throw error;
    if (!data) return json({ ip, blocked: false, reason: null });

    const { data: row } = await client
      .from("blocked_ips")
      .select("reason")
      .eq("ip_address", ip)
      .is("released_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({ ip, blocked: true, reason: row?.reason ?? null });
  } catch (e) {
    // fail-open على مستوى الحجب فقط — مع إرجاع IP كي لا تفقد السجلات مصدرها
    console.error("[client-context] failed:", e instanceof Error ? e.message : e);
    return json({ ip, blocked: false, reason: null });
  }
});
