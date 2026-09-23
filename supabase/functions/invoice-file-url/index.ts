/**
 * invoice-file-url — البوابة الوحيدة لتنزيل ملفات الفواتير.
 * يتحقق على الخادم من: المصادقة، الدور، حجب IP، انتماء الملف لفاتورة، والسنة المالية.
 * لا تُوجد سياسة قراءة مباشرة على حاوية `invoices` — فلا يمكن للمتصفح توليد رابط بنفسه.
 */
import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { extractClientIp } from "../_shared/client-ip.ts";
import { BodySchema, SIGNED_URL_TTL } from "./validation.ts";

type Row = { id: string; fiscal_year_id: string | null; invoice_number: string | null };

Deno.serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) المصادقة + الدور المسموح (support مستثنى — لا وصول لبيانات مالية)
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant", "beneficiary", "waqif"],
      rateLimitKey: "invoice_dl",
      rateLimit: 30,
      rateLimitWindowSeconds: 60,
    });
    if ("error" in auth) return auth.error;
    const { admin, user } = auth;

    // 2) تحقق المدخلات
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, 400);
    }
    const { file_path, download } = parsed.data;
    const ip = extractClientIp(req);

    const logAttempt = async (
      allowed: boolean,
      reason: string,
      row: Row | null,
      source: string | null,
    ) => {
      await admin.rpc("log_access_event", {
        p_event_type: allowed ? "invoice_download" : "invoice_download_denied",
        p_email: user.email ?? undefined,
        p_user_id: user.id,
        p_target_path: `invoices/${file_path}`,
        p_device_info: req.headers.get("user-agent")?.substring(0, 255) ?? undefined,
        p_metadata: {
          reason,
          source,
          ip,
          invoice_id: row?.id ?? null,
          invoice_number: row?.invoice_number ?? null,
          fiscal_year_id: row?.fiscal_year_id ?? null,
        },
      }).then(
        () => undefined,
        () => undefined, // التسجيل لا يمنع الاستجابة
      );
    };

    // 3) فحص حجب IP — fail-open للفحص نفسه فقط
    if (ip) {
      const { data: blocked } = await admin
        .from("blocked_ips")
        .select("reason, expires_at")
        .eq("ip_address", ip)
        .is("released_at", null)
        .maybeSingle();
      const active = Boolean(
        blocked && (!blocked.expires_at || new Date(blocked.expires_at).getTime() > Date.now()),
      );
      if (active) {
        await logAttempt(false, "ip_blocked", null, null);
        return json({ error: "تم حجب هذا الجهاز. راجع ناظر الوقف." }, 403);
      }
    }

    // 4) أدوار المستخدم
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = new Set((roleRows ?? []).map((r: { role: string }) => r.role));
    const privileged = roles.has("admin") || roles.has("accountant");

    // 5) ربط الملف بفاتورة حقيقية (يمنع تنزيل ملفات يتيمة أو مسارات مُخمَّنة)
    const [invRes, payRes] = await Promise.all([
      admin.from("invoices").select("id, fiscal_year_id, invoice_number").eq("file_path", file_path).maybeSingle(),
      admin.from("payment_invoices").select("id, fiscal_year_id, invoice_number").eq("file_path", file_path).maybeSingle(),
    ]);
    const row = (invRes.data ?? payRes.data) as Row | null;
    const source = invRes.data ? "invoices" : payRes.data ? "payment_invoices" : null;

    if (!row) {
      await logAttempt(false, "file_not_registered", null, null);
      return json({ error: "الملف غير مسجّل في النظام" }, 404);
    }

    // 6) تحقق الصلاحية على الخادم — الدور + السنة المالية
    if (!privileged) {
      if (!row.fiscal_year_id) {
        await logAttempt(false, "null_fiscal_year", row, source);
        return json({ error: "لا تملك صلاحية تنزيل هذه الفاتورة" }, 403);
      }
      const { data: fy } = await admin
        .from("fiscal_years")
        .select("published")
        .eq("id", row.fiscal_year_id)
        .maybeSingle();
      if (!fy?.published) {
        await logAttempt(false, "fiscal_year_not_published", row, source);
        return json({ error: "الفاتورة تابعة لسنة مالية غير منشورة" }, 403);
      }
    }

    // 7) رابط موقّع قصير العمر
    const { data: signed, error: signErr } = await admin.storage
      .from("invoices")
      .createSignedUrl(file_path, SIGNED_URL_TTL, download ? { download } : undefined);

    if (signErr || !signed?.signedUrl) {
      await logAttempt(false, "sign_failed", row, source);
      return json({ error: "فشل في إنشاء رابط التحميل" }, 500);
    }

    await logAttempt(true, "granted", row, source);
    return json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL }, 200);
  } catch (e) {
    console.error("invoice-file-url failed", e instanceof Error ? e.message : e);
    return json({ error: "خطأ غير متوقع في الخادم" }, 500);
  }
});
