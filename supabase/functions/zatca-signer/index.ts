import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { getCorsHeaders } from "../_shared/cors.ts";

async function sha256Base64(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supaAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supaAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "accountant"]);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { invoice_id, table } = await req.json();
    if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get invoice data for hashing
    const { data: inv, error: invErr } = await admin.from(table).select("*").eq("id", invoice_id).single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build hash content: invoice_number + amount + date + vat
    const hashContent = `${inv.invoice_number}|${inv.amount}|${inv.date || inv.due_date}|${inv.vat_amount}`;
    const invoiceHash = await sha256Base64(hashContent);

    // Get next ICV
    const { data: nextIcv } = await admin.rpc("get_next_icv");
    const icv = nextIcv || 1;

    // Get previous hash
    const { data: lastChain } = await admin.from("invoice_chain").select("invoice_hash").order("icv", { ascending: false }).limit(1).single();
    const previousHash = lastChain?.invoice_hash || "0";

    // Insert into chain
    await admin.from("invoice_chain").insert({
      invoice_id,
      icv,
      invoice_hash: invoiceHash,
      previous_hash: previousHash,
    });

    // Update invoice with hash and ICV
    if (table === "invoices") {
      await admin.from("invoices").update({ invoice_hash: invoiceHash, icv }).eq("id", invoice_id);
    }

    return new Response(JSON.stringify({ success: true, icv, invoice_hash: invoiceHash, previous_hash: previousHash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('zatca-signer error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
