/**
 * client-context — يعيد عنوان IP للعميل وحالة الحجب.
 * لا يتطلب مصادقة (يُستخدم أيضاً في شاشة الدخول) لكنه لا يكشف أي بيانات حسّاسة.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const extractIp = (req: Request): string | null => {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first.substring(0, 64);
  }
  return req.headers.get('cf-connecting-ip')?.substring(0, 64)
    ?? req.headers.get('x-real-ip')?.substring(0, 64)
    ?? null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = extractIp(req);
  if (!ip) return json({ ip: null, blocked: false, reason: null });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await admin
      .from('blocked_ips')
      .select('reason, expires_at, released_at')
      .eq('ip_address', ip)
      .is('released_at', null)
      .maybeSingle();

    if (error) throw error;

    const active = Boolean(
      data && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now()),
    );

    return json({ ip, blocked: active, reason: active ? data?.reason ?? null : null });
  } catch (_e) {
    // fail-open للـ IP فقط: لا نمنع المستخدمين عند فشل الفحص، لكن لا نكشف الخطأ
    return json({ ip, blocked: false, reason: null });
  }
});
