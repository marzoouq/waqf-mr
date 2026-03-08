import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZATCA_API_URL = Deno.env.get("ZATCA_API_URL") || "";

import { getCorsHeaders } from "../_shared/cors.ts";

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

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin"]);
    if (!roles?.length) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    if (!ZATCA_API_URL && action !== "onboard") {
      return new Response(JSON.stringify({ error: "ZATCA_API_URL not configured. Set up the secret first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Onboarding ───
    if (action === "onboard") {
      // In production, this would:
      // 1. Generate CSR using ZATCA_PRIVATE_KEY
      // 2. Send CSR + OTP to ZATCA Fatoora API
      // 3. Receive CSID (Compliance or Production)
      // 4. Store in zatca_certificates

      if (!ZATCA_API_URL) {
        // Store placeholder certificate for development
        await admin.from("zatca_certificates").insert({
          certificate_type: "compliance",
          certificate: "PLACEHOLDER_CERTIFICATE_DEV",
          private_key: "PLACEHOLDER_KEY_DEV",
          request_id: `DEV-${Date.now()}`,
          is_active: true,
        });

        return new Response(JSON.stringify({
          success: true,
          message: "Development certificate created. Configure ZATCA_API_URL for production onboarding.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Production onboarding
      const otp = Deno.env.get("ZATCA_OTP") || "";
      const privateKey = Deno.env.get("ZATCA_PRIVATE_KEY") || "";

      if (!otp || !privateKey) {
        return new Response(JSON.stringify({ error: "ZATCA_OTP and ZATCA_PRIVATE_KEY secrets are required for production onboarding" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const csrResponse = await fetch(`${ZATCA_API_URL}/compliance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "OTP": otp },
          body: JSON.stringify({ csr: privateKey }),
        });

        if (!csrResponse.ok) {
          const errText = await csrResponse.text();
          return new Response(JSON.stringify({ error: `ZATCA API error: ${errText}` }), {
            status: csrResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const csrData = await csrResponse.json();

        // Deactivate old certificates
        await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);

        await admin.from("zatca_certificates").insert({
          certificate_type: "compliance",
          certificate: csrData.binarySecurityToken || csrData.certificate || "",
          private_key: privateKey,
          request_id: csrData.requestID || "",
          is_active: true,
        });

        return new Response(JSON.stringify({ success: true, request_id: csrData.requestID }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchErr) {
        return new Response(JSON.stringify({ error: `Failed to reach ZATCA API: ${(fetchErr as Error).message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Report / Clearance ───
    if (action === "report" || action === "clearance") {
      const { invoice_id, table } = body;
      if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
        return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get active certificate
      const { data: cert } = await admin.from("zatca_certificates").select("*").eq("is_active", true).limit(1).single();
      if (!cert) {
        return new Response(JSON.stringify({ error: "No active ZATCA certificate. Complete onboarding first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get invoice
      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get XML (for invoices table) or build minimal payload
      const xml = table === "invoices" ? (inv.zatca_xml || "") : "";

      if (!xml && table === "invoices") {
        return new Response(JSON.stringify({ error: "Generate XML first before submitting" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Submit to ZATCA
      const endpoint = action === "clearance" ? "clearance" : "reporting";
      try {
        const zatcaRes = await fetch(`${ZATCA_API_URL}/invoices/${endpoint}/single`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(`${cert.certificate}:${cert.private_key}`)}`,
            "Accept-Language": "ar",
          },
          body: JSON.stringify({
            invoiceHash: inv.invoice_hash || "",
            uuid: inv.zatca_uuid || "",
            invoice: btoa(xml),
          }),
        });

        const zatcaData = await zatcaRes.json().catch(() => ({}));
        const newStatus = zatcaRes.ok ? (action === "clearance" ? "cleared" : "reported") : "rejected";

        // Update zatca_status
        await admin.from(table).update({ zatca_status: newStatus }).eq("id", invoice_id);

        return new Response(JSON.stringify({
          success: zatcaRes.ok,
          status: newStatus,
          zatca_response: zatcaData,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        // Mark as rejected on network failure
        await admin.from(table).update({ zatca_status: "rejected" }).eq("id", invoice_id);
        return new Response(JSON.stringify({ error: `ZATCA API unreachable: ${(fetchErr as Error).message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: onboard, report, clearance" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
