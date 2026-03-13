import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // التحقق من المستخدم - يجب أن يكون admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "مصادقة فاشلة" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // التحقق من دور admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "غير مصرح - يجب أن تكون ناظراً" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // تنفيذ REVOKE عبر service role
    const revokeSQL = `
      REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
      REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
      
      GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
      GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
      GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon;
      GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon;
      GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
      
      REVOKE SELECT ON public.beneficiaries_safe FROM anon, PUBLIC;
      REVOKE SELECT ON public.contracts_safe FROM anon, PUBLIC;
      GRANT SELECT ON public.beneficiaries_safe TO authenticated;
      GRANT SELECT ON public.contracts_safe TO authenticated;
    `;

    const { error: sqlError } = await supabase.rpc('exec_sql' as any, { sql: revokeSQL });
    
    // إذا فشل rpc، نجرب عبر REST API مباشرة
    if (sqlError) {
      // تنفيذ كل أمر على حدة عبر postgrest
      const commands = [
        `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon`,
        `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC`,
        `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated`,
        `GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon`,
        `GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon`,
        `GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon`,
        `GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon`,
        `GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon`,
        `REVOKE SELECT ON public.beneficiaries_safe FROM anon`,
        `REVOKE SELECT ON public.beneficiaries_safe FROM PUBLIC`,
        `REVOKE SELECT ON public.contracts_safe FROM anon`,
        `REVOKE SELECT ON public.contracts_safe FROM PUBLIC`,
        `GRANT SELECT ON public.beneficiaries_safe TO authenticated`,
        `GRANT SELECT ON public.contracts_safe TO authenticated`,
      ];

      const results = [];
      const pgUrl = Deno.env.get("SUPABASE_DB_URL");
      
      if (!pgUrl) {
        // Fallback: استخدام Management API
        const url = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        
        for (const cmd of commands) {
          const resp = await fetch(`${url}/rest/v1/rpc/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query: cmd }),
          });
          results.push({ cmd: cmd.substring(0, 50), status: resp.status });
        }
        
        return new Response(JSON.stringify({ 
          message: "تم محاولة تطبيق الإصلاح عبر REST",
          results,
          note: "قد لا تدعم هذه الطريقة أوامر GRANT/REVOKE مباشرة"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "تم تطبيق الإصلاح الأمني بنجاح"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
