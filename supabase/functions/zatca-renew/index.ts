// ═══════════════════════════════════════════════════════════════════════════════
// zatca-renew: تجديد شهادة الإنتاج (API #5)
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
    const auth = await authenticateAdmin(req, corsHeaders, "zatca-renew");
    if ("error" in auth) return auth.error;
    const { user, admin } = auth;

    const ZATCA_API_URL = await resolveZatcaUrl(admin);
    if (!ZATCA_API_URL) {
      return new Response(JSON.stringify({ error: "لم يتم تحديد بوابة ZATCA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // جلب OTP
    let otp = "";
    const { data: otpRows } = await admin.from("app_settings").select("key, value").in("key", ["zatca_otp_2", "zatca_otp_1"]);
    if (otpRows?.length) {
      const otp2 = otpRows.find((r: { key: string; value: string }) => r.key === "zatca_otp_2");
      const otp1 = otpRows.find((r: { key: string; value: string }) => r.key === "zatca_otp_1");
      otp = otp2?.value || otp1?.value || "";
    }
    if (!otp) otp = Deno.env.get("ZATCA_OTP") || "";

    if (!otp) {
      await logZatcaOperation(admin, { operation_type: "renew", status: "error", error_message: "رمز التفعيل OTP مطلوب للتجديد", user_id: user.id });
      return new Response(JSON.stringify({ error: "رمز التفعيل OTP مطلوب للتجديد. أدخله من صفحة إعدادات ZATCA." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    if (!deviceSerial) missingFields.push("zatca_device_serial");
    if (!vatNumber) missingFields.push("vat_registration_number");
    if (!orgName) missingFields.push("waqf_name");

    if (missingFields.length > 0) {
      await logZatcaOperation(admin, { operation_type: "renew", status: "error", error_message: `حقول مفقودة: ${missingFields.join("، ")}`, user_id: user.id });
      return new Response(JSON.stringify({ error: `حقول مطلوبة مفقودة: ${missingFields.join("، ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // الخطوة 1: توليد CSR جديد
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
      console.error("Renew CSR generation error:", csrErr);
      await logZatcaOperation(admin, { operation_type: "renew", status: "error", error_message: "فشل توليد CSR للتجديد", user_id: user.id });
      return new Response(JSON.stringify({ error: "فشل توليد طلب الشهادة (CSR) للتجديد" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // دالة مساعدة لحذف OTP بعد أي نتيجة
    const clearOtp = () => admin.from("app_settings").delete().in("key", ["zatca_otp_1", "zatca_otp_2"]).then(() => {}).catch(() => {});

    try {
      // الخطوة 2: الحصول على Compliance CSID جديد
      const csrResponse = await fetch(`${ZATCA_API_URL}/compliance`, { method: "POST", headers: { ...ZATCA_COMMON_HEADERS, "OTP": otp }, body: JSON.stringify({ csr: csrPem }) });
      if (!csrResponse.ok) {
        const errText = await csrResponse.text();
        await logZatcaOperation(admin, { operation_type: "renew", status: "error", request_summary: { step: "compliance", url: `${ZATCA_API_URL}/compliance` }, response_summary: { status_code: csrResponse.status }, error_message: errText, user_id: user.id });
        await clearOtp();
        return new Response(JSON.stringify({ error: `فشل الحصول على شهادة امتثال للتجديد: ${errText}` }), { status: csrResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const csrData = await csrResponse.json();
      const renewBst = csrData.binarySecurityToken || "";
      const renewSecret = csrData.secret || "";
      const renewRequestId = csrData.requestID || "";

      // الخطوة 3: الحصول على Production CSID جديد
      const prodResponse = await fetch(`${ZATCA_API_URL}/production/csids`, {
        method: "PATCH",
        headers: { ...ZATCA_COMMON_HEADERS, "Authorization": `Basic ${btoa(`${renewBst}:${renewSecret}`)}`, "OTP": otp },
        body: JSON.stringify({ compliance_request_id: renewRequestId }),
      });
      if (!prodResponse.ok) {
        const errText = await prodResponse.text();
        await logZatcaOperation(admin, { operation_type: "renew", status: "error", request_summary: { step: "production", url: `${ZATCA_API_URL}/production/csids` }, response_summary: { status_code: prodResponse.status }, error_message: errText, user_id: user.id });
        await clearOtp();
        return new Response(JSON.stringify({ error: `فشل تجديد شهادة الإنتاج: ${errText}` }), { status: prodResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const prodData = await prodResponse.json();

      // تحديث الشهادة النشطة
      await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);
      const renewExpiry = parseCertExpiry(prodData.binarySecurityToken || "");
      await admin.from("zatca_certificates").insert({ certificate_type: "production", certificate: prodData.binarySecurityToken || "", private_key: privKeyHex, zatca_secret: prodData.secret || "", request_id: prodData.requestID || "", is_active: true, expires_at: renewExpiry });
      await clearOtp();

      await logZatcaOperation(admin, { operation_type: "renew", status: "success", request_summary: { platform: isProduction ? "production" : "sandbox" }, response_summary: { request_id: prodData.requestID, certificate_type: "production" }, user_id: user.id });
      return new Response(JSON.stringify({ success: true, request_id: prodData.requestID, certificate_type: "production", message: "تم تجديد شهادة الإنتاج بنجاح" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (fetchErr) {
      const errMsg = `ZATCA API unreachable: ${(fetchErr as Error).message}`;
      await logZatcaOperation(admin, { operation_type: "renew", status: "error", error_message: errMsg, user_id: user.id });
      await clearOtp();
      return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error('zatca-renew error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
