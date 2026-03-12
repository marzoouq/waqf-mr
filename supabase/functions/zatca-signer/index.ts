import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as secp256k1 from "https://esm.sh/@noble/secp256k1@2.1.0";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Minimal XML Canonicalization (C14N-like)
 * Normalizes whitespace, removes XML declaration and comments, sorts attributes.
 * For full C14N compliance a dedicated library would be needed,
 * but this covers ZATCA's practical requirements for simplified invoices.
 */
function canonicalizeXml(xml: string): string {
  let c = xml;
  // Remove XML declaration
  c = c.replace(/<\?xml[^?]*\?>\s*/g, "");
  // Remove comments (including the placeholder comments)
  c = c.replace(/<!--[\s\S]*?-->/g, "");
  // Normalize line endings to LF
  c = c.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Remove leading/trailing whitespace on each line and collapse blank lines
  c = c
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
  return c;
}

/**
 * SHA-256 hash of text, returns base64-encoded string
 */
async function sha256Base64(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * SHA-256 hash of text, returns hex string (for signing)
 */
function sha256Hex(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return sha256(encoder.encode(text));
}

/**
 * Sign a hash with ECDSA secp256k1
 * privateKeyHex: hex-encoded private key
 * Returns base64-encoded DER signature
 */
function signWithEcdsa(messageHash: Uint8Array, privateKeyHex: string): string {
  try {
    const privKeyBytes = hexToBytes(privateKeyHex);
    const signature = secp256k1.sign(messageHash, privKeyBytes);
    const derBytes = signature.toDERRawBytes();
    return btoa(String.fromCharCode(...derBytes));
  } catch (e) {
    console.error("ECDSA signing error:", e);
    throw new Error("فشل التوقيع الرقمي — تأكد من صحة المفتاح الخاص");
  }
}

function hexToBytes(hex: string): Uint8Array {
  // Remove PEM headers if present
  let clean = hex.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  
  // If it looks like base64 (PEM content), decode it first
  if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length > 64) {
    try {
      const binary = atob(clean);
      // Extract the raw 32-byte key from DER/PKCS8 — last 32 bytes typically
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      // For secp256k1 PKCS8, the private key is the last 32 bytes
      if (bytes.length > 32) {
        return bytes.slice(bytes.length - 32);
      }
      return bytes;
    } catch {
      // Not base64, continue as hex
    }
  }
  
  // Plain hex
  if (clean.startsWith("0x")) clean = clean.slice(2);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

// ─── ZATCA QR TLV (GAP-5 + GAP-10) ───
function berLength(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function encodeTLV(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const lenBytes = berLength(valueBytes.length);
  const tlv = new Uint8Array(1 + lenBytes.length + valueBytes.length);
  tlv[0] = tag;
  tlv.set(lenBytes, 1);
  tlv.set(valueBytes, 1 + lenBytes.length);
  return tlv;
}

function generateZatcaQrTLV(sellerName: string, vatNumber: string, timestamp: string, totalWithVat: number, vatAmount: number): string {
  const entries = [
    encodeTLV(1, sellerName),
    encodeTLV(2, vatNumber),
    encodeTLV(3, timestamp),
    encodeTLV(4, totalWithVat.toFixed(2)),
    encodeTLV(5, vatAmount.toFixed(2)),
  ];
  const totalLength = entries.reduce((sum, e) => sum + e.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const entry of entries) {
    result.set(entry, offset);
    offset += entry.length;
  }
  let binary = '';
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

/**
 * Build the XMLDSig SignedProperties and Signature block
 */
function buildSignatureBlock(
  invoiceHash: string,
  signatureValue: string,
  certificate: string,
  signingTime: string
): string {
  return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
        <ds:Reference Id="invoiceSignedData" URI="">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
              <ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
            </ds:Transform>
            <ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
              <ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
            </ds:Transform>
            <ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>${invoiceHash}</ds:DigestValue>
        </ds:Reference>
        <ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue></ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certificate}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
      <ds:Object>
        <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01011/v1.3.2#" Target="signature">
          <xades:SignedProperties Id="xadesSignedProperties">
            <xades:SignedSignatureProperties>
              <xades:SigningTime>${signingTime}</xades:SigningTime>
            </xades:SignedSignatureProperties>
          </xades:SignedProperties>
        </xades:QualifyingProperties>
      </ds:Object>
    </ds:Signature>`;
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

    // Get invoice data
    const { data: inv, error: invErr } = await admin.from(table).select("*").eq("id", invoice_id).single();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GAP-12: Prevent double signing
    if (inv.invoice_hash) {
      return new Response(JSON.stringify({ error: "الفاتورة موقّعة مسبقاً. لا يمكن التوقيع مرتين." }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify XML exists before signing
    const xml = inv.zatca_xml;
    if (!xml) {
      return new Response(JSON.stringify({ error: "يجب توليد XML أولاً قبل التوقيع" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Step 1: Hash the XML (C14N) ---
    // Remove UBLExtensions and cac:Signature sections before hashing (per ZATCA spec)
    let xmlForHash = xml;
    xmlForHash = xmlForHash.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");
    xmlForHash = xmlForHash.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");
    
    const canonicalized = canonicalizeXml(xmlForHash);
    const invoiceHash = await sha256Base64(canonicalized);

    // --- Step 2: Get certificate and private key ---
    const { data: certData } = await admin.rpc("get_active_zatca_certificate");
    let certificate = "";
    let privateKey = "";
    
    if (certData && !certData.error) {
      certificate = certData.certificate || "";
      privateKey = certData.private_key || "";
    }

    // --- Step 3: Sign with ECDSA if private key is available ---
    let signatureValue = "";
    const signingTime = new Date().toISOString();

    if (privateKey) {
      const hashBytes = sha256Hex(canonicalized);
      signatureValue = signWithEcdsa(hashBytes, privateKey);
    }

    // --- Step 4: Embed signature in XML ---
    let signedXml = xml;
    if (signatureValue && certificate) {
      const signatureBlock = buildSignatureBlock(invoiceHash, signatureValue, certificate, signingTime);
      // Replace the placeholder in UBLExtensions
      signedXml = signedXml.replace(
        /(<ext:ExtensionContent>)\s*<!--[\s\S]*?-->\s*(<\/ext:ExtensionContent>)/,
        `$1\n        ${signatureBlock}\n      $2`
      );
    }

    // --- Step 4b: GAP-5 FIX — Generate QR TLV and inject into XML ---
    try {
      // Fetch seller info for QR
      const { data: settingsRows } = await admin.from("app_settings").select("key, value")
        .in("key", ["waqf_name", "vat_number"]);
      const qrSettings: Record<string, string> = {};
      (settingsRows || []).forEach((s: { key: string; value: string }) => { qrSettings[s.key] = s.value; });

      const sellerName = qrSettings.waqf_name || "";
      const vatNumber = qrSettings.vat_number || "";
      const totalWithVat = Number(inv.amount) || 0;
      const vatAmt = Number(inv.vat_amount) || 0;
      // Use invoice created_at as timestamp
      const qrTimestamp = inv.created_at ? new Date(String(inv.created_at)).toISOString() : new Date().toISOString();

      const qrTlvBase64 = generateZatcaQrTLV(sellerName, vatNumber, qrTimestamp, totalWithVat, vatAmt);
      // Replace QR placeholder in XML
      signedXml = signedXml.replace(
        /(<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">)\s*<!--[^>]*-->\s*(<\/cbc:EmbeddedDocumentBinaryObject>)/,
        `$1${qrTlvBase64}$2`
      );
    } catch (qrErr) {
      console.error("QR TLV generation warning:", qrErr);
      // Non-fatal — continue without QR
    }

    // --- Step 5: Atomic ICV allocation + chain insert (GAP-11 fix) ---
    const { data: chainResult, error: chainErr } = await admin.rpc("allocate_icv_and_chain", {
      p_invoice_id: invoice_id,
      p_invoice_hash: invoiceHash,
    });

    if (chainErr) {
      console.error("Chain allocation error:", chainErr);
      return new Response(JSON.stringify({ error: "فشل تخصيص رقم التسلسل" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const icv = chainResult.icv;
    const previousHash = chainResult.previous_hash;

    // --- Step 6: Update invoice with hash, ICV, and signed XML ---
    const updateData: Record<string, unknown> = {
      invoice_hash: invoiceHash,
      icv,
      zatca_xml: signedXml,
    };

    if (table === "invoices") {
      await admin.from("invoices").update(updateData).eq("id", invoice_id);
    } else if (table === "payment_invoices") {
      await admin.from("payment_invoices").update(updateData as Record<string, unknown>).eq("id", invoice_id);
    }

    return new Response(JSON.stringify({
      success: true,
      icv,
      invoice_hash: invoiceHash,
      previous_hash: previousHash,
      signed: !!signatureValue,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('zatca-signer error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
