import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${serviceKey}`;

    if (!isServiceRole) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Forbidden: admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = thirtyDaysLater.toISOString().split("T")[0];

    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("id, contract_number, tenant_name, end_date, rent_amount")
      .eq("status", "active")
      .gte("end_date", todayStr)
      .lte("end_date", futureStr);

    if (contractsError) throw contractsError;
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ message: "No expiring contracts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ message: "No admins found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("notifications")
      .select("message")
      .gte("created_at", todayStr + "T00:00:00Z")
      .eq("type", "warning");

    const existingMessages = new Set((existing || []).map((n: { message: string }) => n.message));

    const notifications: Array<{
      user_id: string;
      title: string;
      message: string;
      type: string;
      link: string;
    }> = [];

    for (const contract of contracts) {
      const daysLeft = Math.ceil(
        (new Date(contract.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const msg = `عقد رقم ${contract.contract_number} (${contract.tenant_name}) ينتهي خلال ${daysLeft} يوم`;

      if (existingMessages.has(msg)) continue;

      for (const admin of admins) {
        notifications.push({
          user_id: admin.user_id,
          title: "تنبيه: عقد قارب على الانتهاء",
          message: msg,
          type: "warning",
          link: "/dashboard/contracts",
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ sent: notifications.length, contracts: contracts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
