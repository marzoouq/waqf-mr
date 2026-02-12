import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Update contracts whose end_date has passed
    const { data, error } = await supabase
      .from('contracts')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString().split('T')[0])
      .select('id, contract_number, tenant_name');

    if (error) throw error;

    const count = data?.length || 0;

    // Notify admins if any contracts were expired
    if (count > 0) {
      await supabase.rpc('notify_admins', {
        p_title: 'عقود منتهية',
        p_message: `تم تحديث ${count} عقد/عقود إلى حالة "منتهي" تلقائياً`,
        p_type: 'warning',
        p_link: '/dashboard/contracts',
      });
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: count, contracts: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
