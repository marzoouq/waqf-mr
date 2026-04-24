/**
 * ZATCA Invoice Signer — Full XMLDSig (GAP-1 fix)
 *
 * Flow:
 *  1. Allocate ICV atomically first
 *  2. Inject ICV into XML → Strip UBLExtensions + cac:Signature → C14N → SHA-256 → invoiceDigest
 *  3. Build xades:SignedProperties → SHA-256 → propsDigest
 *  4. Build ds:SignedInfo → SHA-256 → sign ECDSA
 *  5. Assemble full ds:Signature block → inject into UBLExtensions
 *  6. Inject QR TLV (with TaxInclusiveAmount) → save
 *
 * Modular layout:
 *   - x509-parser.ts     — ASN.1 DER parsing (issuer, serial, public key)
 *   - xmldsig-builder.ts — SignedInfo + SignedProperties + ECDSA crypto helpers
 *   - qr-tlv.ts          — ZATCA QR TLV (BER) encoding for Phase 2
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { p256 } from "npm:@noble/curves@1.4.0/p256";
import { getCorsHeaders } from "../_shared/cors.ts";
import { c14n } from "../_shared/xml-c14n.ts";

import { extractCertSignatureAndPublicKey } from "./x509-parser.ts";
import { buildXmlDsig, sha256Base64, sha256BytesBase64, hexToBytes } from "./xmldsig-builder.ts";
import { generateZatcaQrTLV } from "./qr-tlv.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const supaAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supaAuth.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401, corsHeaders);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: roles } = await admin.from("user_roles").select("role")
      .eq("user_id", user.id).in("role", ["admin", "accountant"]);
    if (!roles?.length) return json({ error: "Forbidden" }, 403, corsHeaders);

    // Rate limiting: 20 طلب/دقيقة لكل مستخدم
    const { data: isLimited } = await admin.rpc('check_rate_limit', {
      p_key: `zatca-signer:${user.id}`, p_limit: 20, p_window_seconds: 60
    });
    if (isLimited) return json({ error: "تم تجاوز الحد المسموح من الطلبات. حاول بعد دقيقة." }, 429, corsHeaders);

    const { invoice_id, table } = await req.json();
    if (!invoice_id || !table || !["invoices", "payment_invoices"].includes(table)) {
      return json({ error: "Invalid parameters" }, 400, corsHeaders);
    }

    // ── Get Invoice ──
    const { data: inv, error: invErr } = await admin.from(table).select("*").eq("id", invoice_id).single();
    if (invErr || !inv) return json({ error: "Invoice not found" }, 404, corsHeaders);

    // GAP-12: Prevent double signing
    if (inv.invoice_hash) {
      return json({ error: "الفاتورة موقّعة مسبقاً. لا يمكن التوقيع مرتين." }, 409, corsHeaders);
    }

    let xml = inv.zatca_xml;
    if (!xml) {
      return json({ error: "يجب توليد XML أولاً قبل التوقيع" }, 400, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // Pre-sign Validation (Compliance Check)
    // ════════════════════════════════════════════════════════════
    const validationErrors: string[] = [];

    if (!inv.amount && inv.amount !== 0) validationErrors.push("مبلغ الفاتورة مطلوب");
    if (inv.vat_amount === null || inv.vat_amount === undefined) validationErrors.push("مبلغ الضريبة مطلوب");
    if (!inv.zatca_uuid) validationErrors.push("معرّف UUID للفاتورة مطلوب");

    const amountExclVat = Number(inv.amount_excluding_vat ?? inv.amount) || 0;
    const vatAmt = Number(inv.vat_amount) || 0;
    const totalAmt = Number(inv.amount) || 0;
    if (Math.abs((amountExclVat + vatAmt) - totalAmt) > 0.01 && inv.amount_excluding_vat !== null && inv.amount_excluding_vat !== undefined) {
      validationErrors.push(`عدم اتساق المبالغ: المبلغ بدون ضريبة (${amountExclVat}) + الضريبة (${vatAmt}) ≠ الإجمالي (${totalAmt})`);
    }

    if (!xml.includes("<cbc:ID>ICV</cbc:ID>")) validationErrors.push("XML يفتقر لعنصر ICV");
    if (!xml.includes("<ext:UBLExtensions>")) validationErrors.push("XML يفتقر لعنصر UBLExtensions");

    if (validationErrors.length > 0) {
      return json({ error: "فشل التحقق قبل التوقيع", validation_errors: validationErrors }, 422, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // Step 1: Reserve ICV atomically (no chain insert yet — #33 fix)
    // ════════════════════════════════════════════════════════════
    const { data: chainResult, error: chainErr } = await admin.rpc("reserve_icv");

    if (chainErr) {
      console.error("ICV reservation error:", chainErr);
      return json({ error: "فشل حجز رقم التسلسل" }, 500, corsHeaders);
    }

    const icv = chainResult.icv;
    const previousHash = chainResult.previous_hash;

    try {
      // ════════════════════════════════════════════════════════════
      // Step 2: Inject new ICV into XML before hashing
      // ════════════════════════════════════════════════════════════
      xml = xml.replace(
        /(<cac:AdditionalDocumentReference>\s*<cbc:ID>ICV<\/cbc:ID>\s*<cbc:UUID>)\d+(<\/cbc:UUID>)/,
        `$1${icv}$2`,
      );

      // ════════════════════════════════════════════════════════════
      // Step 3: Invoice Digest (strip UBLExtensions + cac:Signature → C14N → SHA-256)
      // ════════════════════════════════════════════════════════════
      let xmlForHash = xml;
      xmlForHash = xmlForHash.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");
      xmlForHash = xmlForHash.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");
      xmlForHash = xmlForHash.replace(
        /<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g, ""
      );
      const invoiceCanon = c14n(xmlForHash);
      const invoiceDigest = await sha256Base64(invoiceCanon);

      // ════════════════════════════════════════════════════════════
      // Step 4: Get certificate + private key
      // ════════════════════════════════════════════════════════════
      const { data: certData } = await admin.rpc("get_active_zatca_certificate");
      let certificate = "";
      let privateKeyRaw: Uint8Array | null = null;

      if (certData && !certData.error) {
        certificate = certData.certificate || "";
        const pk = certData.private_key || "";
        if (pk && !certificate.startsWith("PLACEHOLDER")) {
          privateKeyRaw = hexToBytes(pk);
        }
      }

      if (!privateKeyRaw || !certificate || certificate.startsWith("PLACEHOLDER")) {
        return json({ error: "لا توجد شهادة ZATCA نشطة حقيقية. أكمل عملية الربط (Onboarding) أولاً." }, 400, corsHeaders);
      }

      // ════════════════════════════════════════════════════════════
      // Step 5: Build full XMLDSig Signature
      // ════════════════════════════════════════════════════════════
      let signedXml = xml;
      const signingTime = new Date().toISOString();

      const certBytes = Uint8Array.from(atob(certificate), c => c.charCodeAt(0));
      const certDigest = await sha256BytesBase64(certBytes);

      const dsigBlock = await buildXmlDsig(
        invoiceDigest, certificate, certDigest, signingTime, privateKeyRaw,
      );

      signedXml = signedXml.replace(
        /(<ext:ExtensionContent>)\s*(?:<!--[\s\S]*?-->)?\s*(<\/ext:ExtensionContent>)/,
        `$1\n${dsigBlock}\n$2`,
      );

      // ════════════════════════════════════════════════════════════
      // Step 6: Inject QR TLV (with TaxInclusiveAmount = amount + vat_amount)
      // ════════════════════════════════════════════════════════════
      try {
        const { data: settingsRows } = await admin.from("app_settings").select("key, value")
          .in("key", ["waqf_name", "vat_registration_number"]);
        const qs: Record<string, string> = {};
        (settingsRows || []).forEach((s: { key: string; value: string }) => { qs[s.key] = s.value; });

        const taxInclusiveAmount = (Number(inv.amount) || 0) + (Number(inv.vat_amount) || 0);

        const invoiceType = inv.invoice_type || "simplified";
        const isStandard = invoiceType === "standard" || invoiceType === "388";

        let sigBytes: Uint8Array | undefined;
        let pubKeyBytes: Uint8Array | undefined;
        let certSigBytes: Uint8Array | undefined;
        let certPubKeyBytes: Uint8Array | undefined;

        if (isStandard && certificate && privateKeyRaw) {
          try {
            pubKeyBytes = p256.getPublicKey(privateKeyRaw, false);

            const signedInfoMatch = signedXml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/);
            if (signedInfoMatch) {
              sigBytes = Uint8Array.from(atob(signedInfoMatch[1]), c => c.charCodeAt(0));
            }

            const extracted = extractCertSignatureAndPublicKey(certBytes);
            certSigBytes = extracted.signature;
            certPubKeyBytes = extracted.publicKey;
          } catch (tagErr) {
            console.error("Tags 6-9 extraction warning:", tagErr);
          }
        }

        const issueDate = inv.date || inv.due_date || new Date().toISOString().split("T")[0];
        const issueCreatedAt = inv.created_at ? new Date(String(inv.created_at)) : new Date();
        const issueTime = issueCreatedAt.toISOString().split("T")[1]?.split(".")[0] || "00:00:00";
        const qrTimestamp = `${issueDate}T${issueTime}Z`;

        const qrTlv = generateZatcaQrTLV(
          qs.waqf_name || "", qs.vat_registration_number || "",
          qrTimestamp,
          taxInclusiveAmount, Number(inv.vat_amount) || 0,
          sigBytes, pubKeyBytes, certSigBytes, certPubKeyBytes,
        );
        signedXml = signedXml.replace(
          /(<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">)\s*(?:<!--[^>]*-->)?\s*(<\/cbc:EmbeddedDocumentBinaryObject>)/,
          `$1${qrTlv}$2`,
        );
      } catch (qrErr) {
        console.error("QR TLV warning:", qrErr);
      }

      // ════════════════════════════════════════════════════════════
      // Step 7: Commit chain with real hash + Save signed XML (#33 fix)
      // ════════════════════════════════════════════════════════════
      const { error: commitErr } = await admin.rpc("commit_icv_chain", {
        p_invoice_id: invoice_id,
        p_icv: icv,
        p_invoice_hash: invoiceDigest,
        p_previous_hash: previousHash,
        p_source_table: table,
      });
      if (commitErr) throw new Error(`فشل تثبيت السلسلة: ${commitErr.message}`);

      const updateData: Record<string, unknown> = {
        invoice_hash: invoiceDigest,
        icv,
        zatca_xml: signedXml,
      };

      if (table === "invoices") {
        await admin.from("invoices").update(updateData).eq("id", invoice_id);
      } else {
        await admin.from("payment_invoices").update(updateData as Record<string, unknown>).eq("id", invoice_id);
      }

      return json({
        success: true,
        icv,
        invoice_hash: invoiceDigest,
        previous_hash: previousHash,
        signed: true,
      }, 200, corsHeaders);

    } catch (signErr) {
      console.error("Signing failed:", signErr);
      return json({ error: "فشل التوقيع الإلكتروني. يرجى المحاولة لاحقاً أو التواصل مع الدعم." }, 500, corsHeaders);
    }

  } catch (e) {
    console.error("zatca-signer error:", e instanceof Error ? e.message : e);
    return json({ error: "حدث خطأ أثناء معالجة الطلب" }, 500, corsHeaders);
  }
});

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
