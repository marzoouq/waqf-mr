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

  // عنوان الاتصال الحقيقي فقط: آخر قيمة يضيفها الوكيل الموثوق (لا يمكن للزائر
  // تزويرها بترويسة x-forwarded-for من طرفه) — لا يُقبل أي عنوان يختاره المستدعي.
  const forwarded = req.headers.get("x-forwarded-for");
  const lastHop = forwarded?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  const ip = (lastHop ?? extractClientIp(req))?.substring(0, 64) ?? null;
  if (!ip) return json({ ip: null, blocked: false, reason: null });

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await client.rpc("is_ip_blocked", { p_ip: ip });
    if (error) throw error;
    // سبب الحجب سجل داخلي — لا يُكشف أبداً للزائر
    return json({ ip, blocked: Boolean(data), reason: null });
  } catch (e) {
    // fail-open على مستوى الحجب فقط — مع إرجاع IP كي لا تفقد السجلات مصدرها
    console.error("[client-context] failed:", e instanceof Error ? e.message : e);
    return json({ ip, blocked: false, reason: null });
  }
});
