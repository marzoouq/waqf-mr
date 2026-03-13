import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { p256 } from "https://esm.sh/@noble/curves@1.4.0/p256";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ZATCA_API_URL = Deno.env.get("ZATCA_API_URL") || "";

import { getCorsHeaders } from "../_shared/cors.ts";

// ─── ASN.1 DER Encoding Helpers ───

function asn1Length(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function asn1Wrap(tag: number, content: Uint8Array): Uint8Array {
  const len = asn1Length(content.length);
  const result = new Uint8Array(1 + len.length + content.length);
  result[0] = tag;
  result.set(len, 1);
  result.set(content, 1 + len.length);
  return result;
}

function asn1Sequence(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) {
    content.set(item, offset);
    offset += item.length;
  }
  return asn1Wrap(0x30, content);
}

function asn1Set(items: Uint8Array[]): Uint8Array {
  const totalLen = items.reduce((s, i) => s + i.length, 0);
  const content = new Uint8Array(totalLen);
  let offset = 0;
  for (const item of items) {
    content.set(item, offset);
    offset += item.length;
  }
  return asn1Wrap(0x31, content);
}

function asn1Integer(value: number): Uint8Array {
  return asn1Wrap(0x02, new Uint8Array([value]));
}

function asn1Oid(components: number[]): Uint8Array {
  const bytes: number[] = [];
  bytes.push(components[0] * 40 + components[1]);
  for (let i = 2; i < components.length; i++) {
    let val = components[i];
    if (val >= 128) {
      const stack: number[] = [];
      while (val > 0) {
        stack.unshift(val & 0x7f);
        val >>= 7;
      }
      for (let j = 0; j < stack.length - 1; j++) stack[j] |= 0x80;
      bytes.push(...stack);
    } else {
      bytes.push(val);
    }
  }
  return asn1Wrap(0x06, new Uint8Array(bytes));
}

function asn1Utf8String(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  return asn1Wrap(0x0c, encoded);
}

function asn1PrintableString(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  return asn1Wrap(0x13, encoded);
}

function asn1BitString(data: Uint8Array): Uint8Array {
  const content = new Uint8Array(1 + data.length);
  content[0] = 0; // unused bits
  content.set(data, 1);
  return asn1Wrap(0x03, content);
}

function asn1Context(tag: number, content: Uint8Array): Uint8Array {
  return asn1Wrap(0xa0 | tag, content);
}

function asn1OctetString(data: Uint8Array): Uint8Array {
  return asn1Wrap(0x04, data);
}

function asn1Ia5String(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  return asn1Wrap(0x16, encoded);
}

/**
 * Build X509 Extensions for ZATCA CSR:
 * - SubjectAlternativeName (OID 2.5.29.17) with directoryName containing UID
 * - CertificateTemplateName (OID 1.3.6.1.4.1.311.20.2) for environment
 *
 * ZATCA requires SAN as a directoryName with UID attribute (OID 0.9.2342.19200300.100.1.1)
 * containing the device serial in format: 1-{SolutionName}|2-{UnitType}|3-{SerialNumber}
 */
function buildCsrExtensions(solutionName: string, isProduction: boolean, deviceSerial: string): Uint8Array {
  // --- Extension 1: SubjectAlternativeName (SAN) ---
  // ZATCA spec: SAN must use directoryName [4] with UID attribute
  const sanValue = deviceSerial || `1-${solutionName}|2-1|3-${crypto.randomUUID()}`;

  // UID OID: 0.9.2342.19200300.100.1.1
  const uidAttr = asn1Set([
    asn1Sequence([
      asn1Oid([0, 9, 2342, 19200300, 100, 1, 1]), // UID
      asn1Utf8String(sanValue),
    ]),
  ]);
  // directoryName is context tag [4] (constructed) in GeneralName
  const dirName = asn1Context(4, asn1Sequence([uidAttr]));

  const sanExtValue = asn1OctetString(
    asn1Sequence([dirName])
  );
  const sanExtension = asn1Sequence([
    asn1Oid([2, 5, 29, 17]), // subjectAltName
    sanExtValue,
  ]);

  // --- Extension 2: CertificateTemplateName ---
  const templateName = isProduction ? "ZATCA-Code-Signing" : "PREZATCA-Code-Signing";
  const templateExtValue = asn1OctetString(
    asn1Ia5String(templateName)
  );
  const templateExtension = asn1Sequence([
    asn1Oid([1, 3, 6, 1, 4, 1, 311, 20, 2]), // certificateTemplateName
    templateExtValue,
  ]);

  // Wrap both extensions in a SEQUENCE, then in extensionRequest attribute
  const extensionsSeq = asn1Sequence([sanExtension, templateExtension]);

  // extensionRequest attribute (OID 1.2.840.113549.1.9.14)
  return asn1Context(0,
    asn1Sequence([
      asn1Sequence([
        asn1Oid([1, 2, 840, 113549, 1, 9, 14]), // extensionRequest
        asn1Set([extensionsSeq]),
      ]),
    ])
  );
}

function buildDistinguishedName(attrs: { oid: number[]; value: string }[]): Uint8Array {
  const rdns = attrs.map(attr =>
    asn1Set([
      asn1Sequence([
        asn1Oid(attr.oid),
        attr.oid[3] === 6 ? asn1PrintableString(attr.value) : asn1Utf8String(attr.value),
      ]),
    ])
  );
  return asn1Sequence(rdns);
}

function buildEcSpki(publicKey: Uint8Array): Uint8Array {
  const algId = asn1Sequence([
    asn1Oid([1, 2, 840, 10045, 2, 1]),   // ecPublicKey
    asn1Oid([1, 2, 840, 10045, 3, 1, 7]), // prime256v1 (P-256)
  ]);
  return asn1Sequence([algId, asn1BitString(publicKey)]);
}

async function sha256Async(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function hexToBytes(hex: string): Uint8Array {
  let clean = hex.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length > 64) {
    try {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      if (bytes.length > 32) return bytes.slice(bytes.length - 32);
      return bytes;
    } catch { /* not base64 */ }
  }
  if (clean.startsWith("0x")) clean = clean.slice(2);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

/** Convert DER bytes to PEM with proper headers */
function derToPem(der: Uint8Array, label: string): string {
  const b64 = btoa(String.fromCharCode(...der));
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.substring(i, i + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

// ─── Common ZATCA Headers ───
const ZATCA_COMMON_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Accept-Version": "V2",
};

// ─── Main Handler ───

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
      if (!ZATCA_API_URL) {
        await admin.from("zatca_certificates").insert({
          certificate_type: "compliance",
          certificate: "PLACEHOLDER_CERTIFICATE_DEV",
          private_key: "PLACEHOLDER_KEY_DEV",
          zatca_secret: "PLACEHOLDER_SECRET_DEV",
          request_id: `DEV-${Date.now()}`,
          is_active: true,
        });

        return new Response(JSON.stringify({
          success: true,
          message: "Development certificate created. Configure ZATCA_API_URL for production onboarding.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const otp = Deno.env.get("ZATCA_OTP") || "";

      if (!otp) {
        return new Response(JSON.stringify({ error: "ZATCA_OTP secret is required for production onboarding" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch seller info for CSR subject
      const { data: settingsRows } = await admin.from("app_settings").select("key, value")
        .in("key", ["waqf_name", "vat_registration_number", "zatca_device_serial", "zatca_solution_name"]);
      const settings: Record<string, string> = {};
      (settingsRows || []).forEach((s: { key: string; value: string }) => { settings[s.key] = s.value; });

      const orgName = settings.waqf_name || "";
      const vatNumber = settings.vat_registration_number || "";
      const deviceSerial = settings.zatca_device_serial || "";
      const solutionName = settings.zatca_solution_name || "WaqfManagement";
      const isProduction = ZATCA_API_URL.includes("gw-fatoora.zatca.gov.sa");

      // Validate required identity fields before contacting ZATCA
      const missingFields: string[] = [];
      if (!deviceSerial) missingFields.push("zatca_device_serial (الرقم التسلسلي للجهاز)");
      if (!vatNumber) missingFields.push("vat_registration_number (الرقم الضريبي)");
      if (!orgName) missingFields.push("waqf_name (اسم المنشأة)");

      if (missingFields.length > 0) {
        return new Response(JSON.stringify({
          error: `لا يمكن بدء عملية الربط (Onboarding) بدون تعيين الحقول التالية في الإعدادات: ${missingFields.join("، ")}. يرجى إدخالها من صفحة الإعدادات أولاً.`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Auto-generate ECDSA P-256 private key (no need for ZATCA_PRIVATE_KEY env var)
      let csrPem: string;
      let privBytes: Uint8Array;
      let privKeyHex: string;
      try {
        privBytes = p256.utils.randomPrivateKey(); // 32 bytes
        privKeyHex = Array.from(privBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const pubKey = p256.getPublicKey(privBytes, false);

        // ZATCA spec: CN = Device Serial, O = Organization, SERIALNUMBER = VAT TIN
        const subject = buildDistinguishedName([
          { oid: [2, 5, 4, 6], value: "SA" },
          { oid: [2, 5, 4, 10], value: orgName },
          { oid: [2, 5, 4, 3], value: deviceSerial },
          { oid: [2, 5, 4, 5], value: vatNumber },
        ]);

        const spki = buildEcSpki(pubKey);

        // Build X509 Extensions (SAN + CertificateTemplateName)
        const extensions = buildCsrExtensions(solutionName, isProduction, deviceSerial);

        const certReqInfo = asn1Sequence([
          asn1Integer(0),
          subject,
          spki,
          extensions,
        ]);

        const hashBytes = await sha256Async(certReqInfo);
        const signature = p256.sign(hashBytes, privBytes);
        const sigDer = signature.toDERRawBytes();

        const csrDer = asn1Sequence([
          certReqInfo,
          asn1Sequence([asn1Oid([1, 2, 840, 10045, 4, 3, 2])]), // ecdsaWithSHA256
          asn1BitString(sigDer),
        ]);

        // FIX: Convert DER to base64 (ZATCA expects base64-encoded CSR, not PEM with headers)
        csrPem = btoa(String.fromCharCode(...csrDer));
      } catch (csrErr) {
        console.error("CSR generation error:", csrErr);
        return new Response(JSON.stringify({ error: "فشل توليد طلب الشهادة (CSR)" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const csrResponse = await fetch(`${ZATCA_API_URL}/compliance`, {
          method: "POST",
          headers: {
            ...ZATCA_COMMON_HEADERS,
            "OTP": otp,
          },
          body: JSON.stringify({ csr: csrPem }),
        });

        if (!csrResponse.ok) {
          const errText = await csrResponse.text();
          return new Response(JSON.stringify({ error: `ZATCA API error: ${errText}` }), {
            status: csrResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const csrData = await csrResponse.json();

        // FIX #1: Store ZATCA's secret separately from the private key
        // csrData.secret = the secret ZATCA returns for auth in subsequent requests
        // privateKey = the local ECDSA key used for signing invoices
        await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);

        await admin.from("zatca_certificates").insert({
          certificate_type: "compliance",
          certificate: csrData.binarySecurityToken || "",
          private_key: privKeyHex,         // Auto-generated ECDSA key (encrypted by DB trigger)
          zatca_secret: csrData.secret || "", // ZATCA-provided secret for Authorization header
          request_id: csrData.requestID || "",
          is_active: true,
        });

        return new Response(JSON.stringify({
          success: true,
          request_id: csrData.requestID,
          certificate_type: "compliance",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        return new Response(JSON.stringify({ error: `Failed to reach ZATCA API: ${(fetchErr as Error).message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Compliance Check (send test invoices before production) ───
    if (action === "compliance-check") {
      const { invoice_id, table } = body;
      if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
        return new Response(JSON.stringify({ error: "invoice_id and table are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      if (!certData || certData.error) {
        return new Response(JSON.stringify({ error: "لا توجد شهادة امتثال نشطة. أكمل Onboarding أولاً." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (certData.certificate_type !== "compliance") {
        return new Response(JSON.stringify({ error: "فحص الامتثال يتطلب شهادة compliance. الشهادة الحالية من نوع: " + certData.certificate_type }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get invoice
      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv) {
        return new Response(JSON.stringify({ error: "الفاتورة غير موجودة" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const xml = inv.zatca_xml || "";
      if (!xml || !inv.invoice_hash) {
        return new Response(JSON.stringify({ error: "يجب توليد XML وتوقيعه قبل فحص الامتثال" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bst = certData.certificate || "";
      const secret = certData.zatca_secret || "";

      try {
        const complianceRes = await fetch(`${ZATCA_API_URL}/compliance/invoices`, {
          method: "POST",
          headers: {
            ...ZATCA_COMMON_HEADERS,
            "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`,
            "Accept-Language": "ar",
          },
          body: JSON.stringify({
            invoiceHash: inv.invoice_hash,
            uuid: inv.zatca_uuid || "",
            invoice: btoa(xml),
          }),
        });

        const complianceData = await complianceRes.json().catch(() => ({}));

        return new Response(JSON.stringify({
          success: complianceRes.ok,
          status: complianceRes.status,
          zatca_response: complianceData,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        return new Response(JSON.stringify({ error: `ZATCA API unreachable: ${(fetchErr as Error).message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─── Production Certificate (upgrade from compliance to production) ───
    if (action === "production") {
      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      if (!certData || certData.error) {
        return new Response(JSON.stringify({ error: "لا توجد شهادة امتثال نشطة. أكمل Onboarding أولاً." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const requestId = certData.request_id || "";
      const bst = certData.certificate || "";
      // FIX #1: Use zatca_secret (from ZATCA) not private_key for auth
      const secret = certData.zatca_secret || "";

      try {
        const prodResponse = await fetch(`${ZATCA_API_URL}/production/csids`, {
          method: "POST",
          headers: {
            ...ZATCA_COMMON_HEADERS,
            "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`,
          },
          body: JSON.stringify({ compliance_request_id: requestId }),
        });

        if (!prodResponse.ok) {
          const errText = await prodResponse.text();
          return new Response(JSON.stringify({ error: `ZATCA Production error: ${errText}` }), {
            status: prodResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const prodData = await prodResponse.json();

        // Deactivate compliance cert, activate production cert
        await admin.from("zatca_certificates").update({ is_active: false }).eq("is_active", true);
        await admin.from("zatca_certificates").insert({
          certificate_type: "production",
          certificate: prodData.binarySecurityToken || "",
          private_key: certData.private_key,         // Same local key for signing
          zatca_secret: prodData.secret || "",        // New production secret from ZATCA
          request_id: prodData.requestID || "",
          is_active: true,
        });

        return new Response(JSON.stringify({
          success: true,
          request_id: prodData.requestID,
          certificate_type: "production",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        return new Response(JSON.stringify({ error: `ZATCA API unreachable: ${(fetchErr as Error).message}` }), {
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

      const { data: certData, error: certErr } = await admin.rpc("get_active_zatca_certificate");
      if (certErr || !certData || certData.error) {
        return new Response(JSON.stringify({ error: certData?.error || "No active ZATCA certificate. Complete onboarding first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: inv } = await admin.from(table).select("*").eq("id", invoice_id).single();
      if (!inv) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const xml = inv.zatca_xml || "";
      if (!xml) {
        return new Response(JSON.stringify({ error: "يجب توليد XML وتوقيعه قبل الإرسال" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!inv.invoice_hash) {
        return new Response(JSON.stringify({ error: "يجب توقيع الفاتورة قبل الإرسال" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const endpoint = action === "clearance" ? "clearance" : "reporting";
      const bst = certData.certificate || "";
      // FIX #1: Use zatca_secret for Authorization
      const secret = certData.zatca_secret || "";

      try {
        const zatcaRes = await fetch(`${ZATCA_API_URL}/invoices/${endpoint}/single`, {
          method: "POST",
          headers: {
            ...ZATCA_COMMON_HEADERS,
            "Authorization": `Basic ${btoa(`${bst}:${secret}`)}`,
            "Accept-Language": "ar",
            ...(action === "clearance" ? { "ClearanceStatus": "1" } : {}),
          },
          body: JSON.stringify({
            invoiceHash: inv.invoice_hash,
            uuid: inv.zatca_uuid || "",
            invoice: btoa(xml),
          }),
        });

        const zatcaData = await zatcaRes.json().catch(() => ({}));
        const newStatus = zatcaRes.ok ? (action === "clearance" ? "cleared" : "reported") : "rejected";

        await admin.from(table).update({ zatca_status: newStatus }).eq("id", invoice_id);

        return new Response(JSON.stringify({
          success: zatcaRes.ok,
          status: newStatus,
          zatca_response: zatcaData,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (fetchErr) {
        await admin.from(table).update({ zatca_status: "rejected" }).eq("id", invoice_id);
        return new Response(JSON.stringify({ error: `ZATCA API unreachable: ${(fetchErr as Error).message}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: onboard, compliance-check, production, report, clearance" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('zatca-api error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
