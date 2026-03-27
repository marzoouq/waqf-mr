// ═══════════════════════════════════════════════════════════════════════════════
// zatca-onboard: تسجيل + ترقية إنتاج + اختبار اتصال
// الإجراءات: onboard, production, test-connection
// ═══════════════════════════════════════════════════════════════════════════════

import { p256 } from "npm:@noble/curves@1.4.0/p256";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  ZATCA_COMMON_HEADERS,
  authenticateAdmin,
  resolveZatcaUrl,
  logZatcaOperation,
  parseCertExpiry,
  buildDistinguishedName,
  buildEcSpki,
  buildCsrExtensions,
  asn1Sequence,
  asn1Integer,
  asn1Oid,
  asn1BitString,
  sha256Async,
} from "../_shared/zatca-shared.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateAdmin(req, corsHeaders, "zatca-onboard");
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;

    const body = await req.json();
    const { action } = body;
    const ZATCA_API_URL = await resolveZatcaUrl(admin);

    // ─── test-connection ───
    if (action === "test-connection") {
      if (!ZATCA_API_URL) {
        await logZatcaOperation(admin, { operation_type: "test-connection", status: "error", error_message: "لم يتم تحديد URL البوابة", user_id: user.id });
        return new Response(JSON.stringify({ connected: false, error: "لم يتم تحديد URL البوابة" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const testRes = await fetch(`${ZATCA_API_URL}/compliance`, { method: "GET", headers: { "Accept": "application/json", "Accept-Version": "V2" } });
        const reachable = testRes.status >= 200 && testRes.status < 500;
        await testRes.text();
        await logZatcaOperation(admin, { operation_type: "test-connection", status: reachable ? "success" : "error", request_summary: { url: ZATCA_API_URL }, response_summary: { status_code: testRes.status, connected: reachable }, user_id: user.id });
        return new Response(JSON.stringify({ connected: reachable, url: ZATCA_API_URL, status_code: testRes.status, tested_at: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = (fetchErr as Error).message;
        await logZatcaOperation(admin, { operation_type: "test-connection", status: "error", request_summary: { url: ZATCA_API_URL }, error_message: errMsg, user_id: user.id });
        return new Response(JSON.stringify({ connected: false, url: ZATCA_API_URL, error: errMsg, tested_at: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── onboard ───
    if (action === "onboard") {
      if (!ZATCA_API_URL) {
        await admin.from("zatca_certificates").insert({ certificate_type: "compliance", certificate: "PLACEHOLDER_CERTIFICATE_DEV", private_key: "PLACEHOLDER_KEY_DEV", zatca_secret: "PLACEHOLDER_SECRET_DEV", request_id: `DEV-${Date.now()}`, is_active: false });
        await logZatcaOperation(admin, { operation_type: "onboard", status: "success", request_summary: { mode: "development" }, response_summary: { message: "Development certificate created" }, user_id: user.id });
        return new Response(JSON.stringify({ success: true, message: "Development certificate created. Configure ZATCA_API_URL for production onboarding." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let otp = "";
      const { data: otpRows } = await admin.from("app_settings").select("key, value").in("key", ["zatca_otp_1"]);
      if (otpRows?.length) otp = otpRows[0]?.value || "";
      if (!otp) otp = Deno.env.get("ZATCA_OTP") || "";

      if (!otp) {
        await logZatcaOperation(admin, { operation_type: "onboard", status: "error", error_message: "رمز التفعيل OTP مطلوب", user_id: user.id });
        return new Response(JSON.stringify({ error: "رمز التفعيل OTP مطلوب. أدخله من صفحة إعدادات ZATCA أو عيّنه كمتغير بيئة." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: settingsRows } = await admin.from("app_settings").select("key, value").in("key", ["waqf_name", "vat_registration_number", "zatca_device_serial", "zatca_solution_name"]);
      const settings: Record<string, string> = {};
      (settingsRows || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

      const orgName = settings.waqf_name || "";
      const vatNumber = settings.vat_registration_number || "";
      const deviceSerial = settings.zatca_device_serial || "";
      const solutionName = settings.zatca_solution_name || "WaqfManagement";
      const isProduction = ZATCA_API_URL.includes("gw-fatoora.zatca.gov.sa");

      const missingFields: string[] = [];
      if (!deviceSerial) missingFields.push("zatca_device_serial (الرقم التسلسلي للجهاز)");
      if (!vatNumber) missingFields.push("vat_registration_number (الرقم الضريبي)");
      if (!orgName) missingFields.push("waqf_name (اسم المنشأة)");

      if (missingFields.length > 0) {
        const errMsg = `لا يمكن بدء عملية الربط بدون: ${missingFields.join("، ")}`;
        await logZatcaOperation(admin, { operation_type: "onboard", status: "error", error_message: errMsg, request_summary: { missing_fields: missingFields }, user_id: user.id });
        return new Response(JSON.stringify({ error: `${errMsg}. يرجى إدخالها من صفحة الإعدادات أولاً.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let csrPem: string;
      let privKeyHex: string;
      try {
        const privBytes = p256.utils.randomPrivateKey();
        privKeyHex = Array.from(privBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const pubKey = p256.getPublicKey(privBytes, false);
        const subject = buildDistinguishedName([
          { oid: [2, 5, 4, 6], value: "SA" }, { oid: [2, 5, 4, 10], value: orgName },
          { oid: [2, 5, 4, 3], value: deviceSerial }, { oid: [2, 5, 4, 5], value: vatNumber },
        ]);
        const spki = buildEcSpki(pubKey);
        const extensions = buildCsrExtensions(solutionName, isProduction, deviceSerial);
        const certReqInfo = asn1Sequence([asn1Integer(0), subject, spki, extensions]);
        const hashBytes = await sha256Async(certReqInfo);
        const signature = p256.sign(hashBytes, privBytes);
        const csrDer = asn1Sequence([certReqInfo, asn1Sequence([asn1Oid([1, 2, 840, 10045, 4, 3, 2])]), asn1BitString(signature.toDERRawBytes())]);
        csrPem = btoa(String.fromCharCode(...csrDer));
      } catch (csrErr) {
        console.error("CSR generation error:", csrErr);
        await logZatcaOperation(admin, { operation_type: "onboard", status: "error", error_message: "فشل توليد طلب الشهادة (CSR)", user_id: user.id });
        return new Response(JSON.stringify({ error: "فشل توليد طلب الشهادة (CSR)" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        const csrResponse = await fetch(`${ZATCA_API_URL}/compliance`, { method: "POST", headers: { ...ZATCA_COMMON_HEADERS, "OTP": otp }, body: JSON.stringify({ csr: csrPem }) });
        if (!csrResponse.ok) {
          const errText = await csrResponse.text();
          await logZatcaOperation(admin, { operation_type: "onboard", status: "error", request_summary: { url: `${ZATCA_API_URL}/compliance`, org: orgName }, response_summary: { status_code: csrResponse.status }, error_message: errText, user_id: user.id });
          return new Response(JSON.stringify({ error: `ZATCA API error: ${errText}` }), { status: csrResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const csrData = await csrResponse.json();
        await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);
        const complianceExpiry = parseCertExpiry(csrData.binarySecurityToken || "");
        await admin.from("zatca_certificates").insert({ certificate_type: "compliance", certificate: csrData.binarySecurityToken || "", private_key: privKeyHex, zatca_secret: csrData.secret || "", request_id: csrData.requestID || "", is_active: true, expires_at: complianceExpiry });
        await admin.from("app_settings").delete().in("key", ["zatca_otp_1", "zatca_otp_2"]);
        await logZatcaOperation(admin, { operation_type: "onboard", status: "success", request_summary: { url: `${ZATCA_API_URL}/compliance`, org: orgName, platform: isProduction ? "production" : "sandbox" }, response_summary: { request_id: csrData.requestID, certificate_type: "compliance" }, user_id: user.id });
        return new Response(JSON.stringify({ success: true, request_id: csrData.requestID, certificate_type: "compliance" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = `Failed to reach ZATCA API: ${(fetchErr as Error).message}`;
        await logZatcaOperation(admin, { operation_type: "onboard", status: "error", error_message: errMsg, user_id: user.id });
        return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── production ───
    if (action === "production") {
      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      if (!certData || certData.error) {
        await logZatcaOperation(admin, { operation_type: "production", status: "error", error_message: "لا توجد شهادة امتثال نشطة", user_id: user.id });
        return new Response(JSON.stringify({ error: "لا توجد شهادة امتثال نشطة. أكمل Onboarding أولاً." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const requestId = certData.request_id || "";
      const bst = certData.certificate || "";
      const secret = certData.zatca_secret || "";

      try {
        const prodResponse = await fetch(`${ZATCA_API_URL}/production/csids`, { method: "POST", headers: { ...ZATCA_COMMON_HEADERS, "Authorization": `Basic ${btoa(`${bst}:${secret}`)}` }, body: JSON.stringify({ compliance_request_id: requestId }) });
        if (!prodResponse.ok) {
          const errText = await prodResponse.text();
          await logZatcaOperation(admin, { operation_type: "production", status: "error", request_summary: { url: `${ZATCA_API_URL}/production/csids` }, response_summary: { status_code: prodResponse.status }, error_message: errText, user_id: user.id });
          return new Response(JSON.stringify({ error: `ZATCA Production error: ${errText}` }), { status: prodResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const prodData = await prodResponse.json();
        await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);
        const prodExpiry = parseCertExpiry(prodData.binarySecurityToken || "");
        await admin.from("zatca_certificates").insert({ certificate_type: "production", certificate: prodData.binarySecurityToken || "", private_key: certData.private_key, zatca_secret: prodData.secret || "", request_id: prodData.requestID || "", is_active: true, expires_at: prodExpiry });
        await logZatcaOperation(admin, { operation_type: "production", status: "success", request_summary: { url: `${ZATCA_API_URL}/production/csids` }, response_summary: { request_id: prodData.requestID, certificate_type: "production" }, user_id: user.id });
        return new Response(JSON.stringify({ success: true, request_id: prodData.requestID, certificate_type: "production" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        const errMsg = `ZATCA API unreachable: ${(fetchErr as Error).message}`;
        await logZatcaOperation(admin, { operation_type: "production", status: "error", error_message: errMsg, user_id: user.id });
        return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: onboard, production, test-connection" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error('zatca-onboard error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
