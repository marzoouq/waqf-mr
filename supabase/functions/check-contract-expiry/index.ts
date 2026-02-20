import "../_shared/deno-types.d.ts";
// @ts-expect-error Deno remote URL import is valid at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const isServiceRole = token === serviceKey;

    // Only allow service_role (for cron) or verified admin users
    if (!isServiceRole) {
      if (!authHeader.startsWith("Bearer ") || !token) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claimsData.claims.sub as string;
      const adminClient = createClient(supabaseUrl, serviceKey);
      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
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

    // Fetch admins
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    // Fetch beneficiaries with user accounts
    const { data: beneficiaries } = await supabase
      .from("beneficiaries")
      .select("user_id")
      .not("user_id", "is", null);

    const allRecipients = [
      ...(admins || []).map((a: { user_id: string }) => ({ user_id: a.user_id, role: 'admin' as const })),
      ...(beneficiaries || []).map((b: { user_id: string | null }) => ({ user_id: b.user_id!, role: 'beneficiary' as const })),
    ];

    if (allRecipients.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate — avoid sending duplicate notifications today
    const { data: existing } = await supabase
      .from("notifications")
      .select("message, user_id")
      .gte("created_at", todayStr + "T00:00:00Z")
      .eq("type", "warning");

    const existingByUser = new Map<string, Set<string>>();
    for (const n of existing || []) {
      if (!existingByUser.has(n.user_id)) existingByUser.set(n.user_id, new Set());
      existingByUser.get(n.user_id)!.add(n.message);
    }

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

      for (const recipient of allRecipients) {
        if (existingByUser.get(recipient.user_id)?.has(msg)) continue;
        notifications.push({
          user_id: recipient.user_id,
          title: "تنبيه: عقد قارب على الانتهاء",
          message: msg,
          type: "warning",
          link: recipient.role === 'admin' ? "/dashboard/contracts" : "/beneficiary/notifications",
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
