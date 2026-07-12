/**
 * diagnostics-edge-ping — يقيس latency لكل Edge Functions المسجّلة
 * يستدعيها admin/support من مركز التشخيص. يستخدم OPTIONS/HEAD sanity check
 * بدلاً من استدعاء دوال حقيقية قد تستهلك موارد.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FUNCTIONS = [
  'dashboard-summary',
  'health-check',
  'zatca-onboard',
  'zatca-report',
  'zatca-renew',
  'guard-signup',
  'diagnostics-db-perf',
  'diagnostics-edge-ping',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // تحقق من الدور (admin أو support)
    const { data: roles } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const allowed = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'support');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = await Promise.all(
      FUNCTIONS.map(async (name) => {
        const t0 = performance.now();
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
            method: 'OPTIONS',
            headers: { 'Access-Control-Request-Method': 'POST' },
          });
          await res.text();
          const latencyMs = Math.round(performance.now() - t0);
          return { name, ok: res.ok || res.status === 204, status: res.status, latencyMs };
        } catch (e) {
          return { name, ok: false, status: 0, latencyMs: Math.round(performance.now() - t0), error: (e as Error).message };
        }
      }),
    );

    return new Response(JSON.stringify({ results, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
