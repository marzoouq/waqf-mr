/**
 * client-context — يُرجع عنوان IP للزائر وحالة الحجب.
 *
 * تستدعيها الواجهة عند الإقلاع (src/lib/monitoring/clientContext.ts) لإرفاق
 * عنوان IP بسجلات الوصول، ولمنع الاستخدام من عنوان محجوب عبر IpBlockGuard.
 * لا تتطلب مصادقة — الحجب يجب أن يعمل قبل تسجيل الدخول أيضاً.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/** استخراج أول عنوان IP حقيقي من ترويسات الوكيل */
const resolveIp = (req: Request): string | null => {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = resolveIp(req);
  if (!ip) return json({ ip: null, blocked: false, reason: null });

  try {
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await client.rpc('is_ip_blocked', { p_ip: ip });
    if (error) throw error;

    if (!data) return json({ ip, blocked: false, reason: null });

    const { data: row } = await client
      .from('blocked_ips')
      .select('reason')
      .eq('ip_address', ip)
      .is('released_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({ ip, blocked: true, reason: row?.reason ?? null });
  } catch (_e) {
    // fail-open على مستوى الحجب فقط — مع إرجاع IP كي لا تفقد السجلات المصدر
    return json({ ip, blocked: false, reason: null });
  }
});
