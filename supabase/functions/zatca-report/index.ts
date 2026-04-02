// ═══════════════════════════════════════════════════════════════════════════════
// zatca-report: إرسال/اعتماد + فحص امتثال + فحص QR
// الإجراءات: report, clearance, compliance-check, compliance-buyer-qr, compliance-seller-qr
// ═══════════════════════════════════════════════════════════════════════════════

import { getCorsHeaders } from "../_shared/cors.ts";
import {
  ZATCA_COMMON_HEADERS,
  authenticateAdmin,
  resolveZatcaUrl,
  logZatcaOperation,
} from "../_shared/zatca-shared.ts";

Deno.serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateAdmin(req, corsHeaders, "zatca-report");
    if ("error" in auth) return auth.error!;
    const { user, admin } = auth;

    const body = await req.json();
    const { action, invoice_id, table } = body;
    const ZATCA_API_URL = await resolveZatcaUrl(admin);

    if (!ZATCA_API_URL) {
      return new Response(JSON.stringify({ error: "لم يتم تحديد بوابة ZATCA. اختر المنصة من الإعدادات." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── compliance-check ───
    if (action === "compliance-check") {
      if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
        return new Response(JSON.stringify({ error: "invoice_id and table are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      if (!certData || certData.error) {
        await logZatcaOperation(admin, { operation_type: "compliance-check", status: "error", error_message: "لا توجد شهادة امتثال نشطة", invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ error: "لا توجد شهادة امتثال نشطة. أكمل Onboarding أولاً." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (certData.certificate_type !== "compliance") {
        return new Response(JSON.stringify({ error: "فحص الامتثال يتطلب شهادة compliance. الشهادة الحالية من نوع: " + certData.certificate_type }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv) return new Response(JSON.stringify({ error: "الفاتورة غير موجودة" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!inv.zatca_xml || !inv.invoice_hash) {
        return new Response(JSON.stringify({ error: "يجب توليد XML وتوقيعه قبل فحص الامتثال" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const bst = certData.certificate || "";
      const secret = certData.zatca_secret || "";
      try {
        const complianceRes = await fetch(`${ZATCA_API_URL}/compliance/invoices`, {
          method: "POST",
          headers: { ...ZATCA_COMMON_HEADERS, "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`, "Accept-Language": "ar" },
          body: JSON.stringify({ invoiceHash: inv.invoice_hash, uuid: inv.zatca_uuid || "", invoice: btoa(inv.zatca_xml) }),
        });
        const complianceData = await complianceRes.json().catch(() => ({}));
        const vr = complianceData?.validationResults || {};
        await logZatcaOperation(admin, { operation_type: "compliance-check", status: complianceRes.ok ? "success" : "error", request_summary: { invoice_id, table }, response_summary: { status_code: complianceRes.status, warnings: (vr.warningMessages || []).length, errors: (vr.errorMessages || []).length }, error_message: complianceRes.ok ? undefined : JSON.stringify(vr.errorMessages || []).slice(0, 500), invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ success: complianceRes.ok, status: complianceRes.status, validationResults: vr, warningMessages: vr.warningMessages || complianceData?.warningMessages || [], errorMessages: vr.errorMessages || complianceData?.errorMessages || [], infoMessages: vr.infoMessages || complianceData?.infoMessages || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = `ZATCA API unreachable: ${(fetchErr as Error).message}`;
        await logZatcaOperation(admin, { operation_type: "compliance-check", status: "error", error_message: errMsg, invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── compliance-buyer-qr / compliance-seller-qr ───
    if (action === "compliance-buyer-qr" || action === "compliance-seller-qr") {
      if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
        return new Response(JSON.stringify({ error: "invoice_id and table are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      if (!certData || certData.error || certData.certificate_type !== "compliance") {
        return new Response(JSON.stringify({ error: "فحص QR يتطلب شهادة compliance نشطة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv || !inv.zatca_xml || !inv.invoice_hash) {
        return new Response(JSON.stringify({ error: "الفاتورة غير موجودة أو لم يتم توقيعها" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const qrEndpoint = action === "compliance-buyer-qr" ? "buyer-qrs" : "seller-qrs";
      const bst = certData.certificate || "";
      const secret = certData.zatca_secret || "";
      try {
        const qrRes = await fetch(`${ZATCA_API_URL}/compliance/${qrEndpoint}`, {
          method: "POST",
          headers: { ...ZATCA_COMMON_HEADERS, "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`, "Accept-Language": "ar" },
          body: JSON.stringify({ invoiceHash: inv.invoice_hash, uuid: inv.zatca_uuid || "", invoice: btoa(inv.zatca_xml) }),
        });
        const qrData = await qrRes.json().catch(() => ({}));
        await logZatcaOperation(admin, { operation_type: action, status: qrRes.ok ? "success" : "error", request_summary: { invoice_id, table, endpoint: qrEndpoint }, response_summary: { status_code: qrRes.status }, error_message: qrRes.ok ? undefined : JSON.stringify(qrData).slice(0, 500), invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ success: qrRes.ok, status: qrRes.status, data: qrData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = `ZATCA API unreachable: ${(fetchErr as Error).message}`;
        await logZatcaOperation(admin, { operation_type: action, status: "error", error_message: errMsg, invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── report / clearance ───
    if (action === "report" || action === "clearance") {
      if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
        return new Response(JSON.stringify({ error: "Invalid parameters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: certData, error: certErr } = await admin.rpc("get_active_zatca_certificate");
      if (certErr || !certData || certData.error) {
        await logZatcaOperation(admin, { operation_type: action, status: "error", error_message: certData?.error || "No active ZATCA certificate", invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ error: certData?.error || "No active ZATCA certificate. Complete onboarding first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv) return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const xml = inv.zatca_xml || "";
      if (!xml) return new Response(JSON.stringify({ error: "يجب توليد XML وتوقيعه قبل الإرسال" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!inv.invoice_hash) return new Response(JSON.stringify({ error: "يجب توقيع الفاتورة قبل الإرسال" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const endpoint = action === "clearance" ? "clearance" : "reporting";
      const bst = certData.certificate || "";
      const secret = certData.zatca_secret || "";

      try {
        const zatcaRes = await fetch(`${ZATCA_API_URL}/invoices/${endpoint}/single`, {
          method: "POST",
          headers: { ...ZATCA_COMMON_HEADERS, "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`, "Accept-Language": "ar", ...(action === "clearance" ? { "ClearanceStatus": "1" } : {}) },
          body: JSON.stringify({ invoiceHash: inv.invoice_hash, uuid: inv.zatca_uuid || "", invoice: btoa(xml) }),
        });

        // 303: آلية الاعتماد غير مفعّلة
        if (zatcaRes.status === 303 && action === "clearance") {
          await logZatcaOperation(admin, { operation_type: "clearance", status: "redirect", request_summary: { invoice_id, table }, response_summary: { status_code: 303, message: "Clearance disabled — use Reporting API" }, invoice_id, user_id: user.id });
          return new Response(JSON.stringify({ success: false, status: "redirect_to_reporting", message: "آلية الاعتماد (Clearance) غير مفعّلة حالياً. استخدم الإرسال (Reporting) بدلاً من الاعتماد لتقديم هذه الفاتورة.", zatca_status_code: 303 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const zatcaData = await zatcaRes.json().catch(() => ({}));
        const newStatus = zatcaRes.ok ? (action === "clearance" ? "cleared" : "reported") : "rejected";
        await admin.from(table).update({ zatca_status: newStatus }).eq("id", invoice_id);
        await logZatcaOperation(admin, { operation_type: action, status: zatcaRes.ok ? "success" : "error", request_summary: { invoice_id, table, endpoint }, response_summary: { status_code: zatcaRes.status, zatca_status: newStatus, validation: zatcaData?.validationResults ? { warnings: (zatcaData.validationResults.warningMessages || []).length, errors: (zatcaData.validationResults.errorMessages || []).length } : undefined }, error_message: zatcaRes.ok ? undefined : JSON.stringify(zatcaData).slice(0, 500), invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ success: zatcaRes.ok, status: newStatus, zatca_response: zatcaData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = `ZATCA API unreachable: ${(fetchErr as Error).message}`;
        await admin.from(table).update({ zatca_status: "rejected" }).eq("id", invoice_id);
        await logZatcaOperation(admin, { operation_type: action, status: "error", error_message: errMsg, invoice_id, user_id: user.id });
        return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: report, clearance, compliance-check, compliance-buyer-qr, compliance-seller-qr" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('zatca-report error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
