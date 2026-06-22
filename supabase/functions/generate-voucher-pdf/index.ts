// ═══════════════════════════════════════════════════════════════════════════════
// generate-voucher-pdf — توليد PDF لسند صرف داخلي (Tajawal/Amiri RTL)
// ───────────────────────────────────────────────────────────────────────────────
// السندات الداخلية ليست فواتير ضريبية — لا VAT ولا ZATCA. PDF يُرفع إلى bucket
// خاص (private) ويتم تنزيله لاحقاً عبر signed URL قصير الأمد.
// ═══════════════════════════════════════════════════════════════════════════════

import { getCorsHeaders } from "../_shared/cors.ts";
import { authenticate } from "../_shared/auth.ts";
import { renderVoucherPdf } from "./pdf-renderer.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const RequestSchema = z.object({
  voucher_id: z.string().uuid("voucher_id يجب أن يكون UUID صالحاً"),
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticate(req, corsHeaders, {
      allowedRoles: ["admin", "accountant"],
      rateLimitKey: "voucher_pdf",
      rateLimit: 10,
      rateLimitWindowSeconds: 60,
    });
    if ("error" in auth) return auth.error;
    const { admin, user } = auth;
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const rawBody = await req.json().catch(() => ({}));
    const parsedBody = RequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonError("voucher_id غير صالح", 400, corsHeaders);
    }
    const voucherId = parsedBody.data.voucher_id;

    const { data: voucher, error: vErr } = await admin
      .from("disbursement_vouchers")
      .select("*")
      .eq("id", voucherId)
      .single();
    if (vErr || !voucher) return jsonError("السند غير موجود", 404, corsHeaders);
    if (voucher.status !== "approved") {
      return jsonError("لا يمكن توليد PDF إلا للسندات المعتمدة", 400, corsHeaders);
    }

    const { data: fiscalYear } = await admin
      .from("fiscal_years")
      .select("status")
      .eq("id", voucher.fiscal_year_id)
      .single();
    if (fiscalYear?.status === "closed") {
      const { data: adminRole } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!adminRole) return jsonError("لا يمكن إصدار سند سنة مالية مقفلة إلا بواسطة الناظر", 403, corsHeaders);
    }

    const pdfBytes = await renderVoucherPdf({
      voucher_number: voucher.voucher_number,
      recipient_name: voucher.recipient_name,
      recipient_id_number: voucher.recipient_id_number,
      recipient_phone: voucher.recipient_phone,
      amount: Number(voucher.amount),
      payment_method: voucher.payment_method,
      transfer_reference: voucher.transfer_reference,
      work_description: voucher.work_description,
      signature_data: voucher.signature_data,
      approved_at: voucher.approved_at,
      created_at: voucher.created_at,
    });

    const safeName = voucher.voucher_number.replace(/[./\\]+/g, "_");
    const storagePath = `${voucher.fiscal_year_id}/${safeName}.pdf`;

    const { error: upErr } = await admin.storage
      .from("disbursement-vouchers")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    const { error: updErr } = await userClient
      .from("disbursement_vouchers")
      .update({ pdf_path: storagePath })
      .eq("id", voucherId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, pdf_path: storagePath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // F11: تعقيم — لا تُسجَّل stack traces (قد تكشف مسارات النظام)
    console.error("generate-voucher-pdf error:", err instanceof Error ? err.message : "unknown");
    return jsonError("فشل توليد سند الصرف", 500, corsHeaders);
  }
});

function jsonError(message: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
