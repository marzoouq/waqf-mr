/**
 * ZATCA Invoice Signer — Full XMLDSig (GAP-1 fix)
 *
 * Flow:
 *  1. Strip UBLExtensions + cac:Signature → C14N → SHA-256 → invoiceDigest
 *  2. Build xades:SignedProperties (cert hash, signing time) → C14N → SHA-256 → propsDigest
 *  3. Build ds:SignedInfo (invoiceDigest + propsDigest) → C14N → SHA-256 → sign ECDSA
 *  4. Assemble full ds:Signature block → inject into UBLExtensions
 *  5. Inject QR TLV → allocate ICV → save
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { p256 } from "https://esm.sh/@noble/curves@1.4.0/p256";
import { sha256 } from "https://esm.sh/@noble/hashes@1.4.0/sha256";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

import { getCorsHeaders } from "../_shared/cors.ts";

// ═══════════════════════════════════════════════════════════════
// XML Canonicalization (Exclusive C14N — W3C compatible)
// ═══════════════════════════════════════════════════════════════

/**
 * Practical Exclusive XML Canonicalization for ZATCA UBL 2.1 invoices.
 *
 * Implements the required subset of https://www.w3.org/TR/xml-exc-c14n/:
 *  - Removes XML declaration & comments
 *  - Normalizes line endings to LF
 *  - Expands self-closing tags: <foo/> → <foo></foo>
 *  - Sorts attributes alphabetically (namespace attrs first, then local)
 *  - Normalizes attribute whitespace
 *  - Preserves significant whitespace in text nodes
 *  - Removes redundant inter-element whitespace
 */
function c14n(xml: string): string {
  let c = xml;

  // 1. Remove XML declaration
  c = c.replace(/<\?xml[^?]*\?>\s*/g, "");

  // 2. Remove all comments
  c = c.replace(/<!--[\s\S]*?-->/g, "");

  // 3. Normalize line endings to LF
  c = c.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 4. Expand self-closing tags: <tag attr="val"/> → <tag attr="val"></tag>
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((?:\s+[^>]*?)?)\/>/g, (_m, tag, attrs) => {
    return `<${tag}${attrs}></${tag}>`;
  });

  // 5. Sort attributes within each opening tag
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((\s+[^>]*?)?)\s*>/g, (_m, tag, attrsStr) => {
    if (!attrsStr || !attrsStr.trim()) return `<${tag}>`;

    // Parse attributes
    const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)="([^"]*)"/g;
    const attrs: Array<{ name: string; value: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(attrsStr)) !== null) {
      attrs.push({ name: match[1], value: match[2] });
    }

    // Sort: xmlns attributes first (sorted), then other attributes (sorted)
    attrs.sort((a, b) => {
      const aIsNs = a.name === "xmlns" || a.name.startsWith("xmlns:");
      const bIsNs = b.name === "xmlns" || b.name.startsWith("xmlns:");
      if (aIsNs && !bIsNs) return -1;
      if (!aIsNs && bIsNs) return 1;
      return a.name.localeCompare(b.name);
    });

    const sortedAttrs = attrs.map(a => ` ${a.name}="${a.value}"`).join("");
    return `<${tag}${sortedAttrs}>`;
  });

  // 6. Remove whitespace-only text nodes between elements
  c = c.replace(/>\s+</g, (match) => {
    // Preserve a single newline for readability in canonical form
    return ">\n<";
  });

  // 7. Trim and remove blank lines
  c = c
    .split("\n")
    .map(line => line.trimEnd())
    .filter(line => line.length > 0)
    .join("\n");

  return c;
}

// ═══════════════════════════════════════════════════════════════
// Cryptographic Helpers
// ═══════════════════════════════════════════════════════════════

/** SHA-256 → base64 */
async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** SHA-256 → Uint8Array (for ECDSA signing) */
function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/** SHA-256 of raw bytes → base64 */
async function sha256BytesBase64(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** Sign hash with ECDSA secp256k1 → base64 DER */
function signEcdsa(messageHash: Uint8Array, privateKeyRaw: Uint8Array): string {
  const sig = secp256k1.sign(messageHash, privateKeyRaw);
  return btoa(String.fromCharCode(...sig.toDERRawBytes()));
}

function hexToBytes(hex: string): Uint8Array {
  let clean = hex.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");

  // Base64 (PEM body) → decode and extract last 32 bytes
  if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length > 64) {
    try {
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.length > 32 ? bytes.slice(bytes.length - 32) : bytes;
    } catch { /* not base64 */ }
  }

  if (clean.startsWith("0x")) clean = clean.slice(2);
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

// ═══════════════════════════════════════════════════════════════
// XMLDSig Builder
// ═══════════════════════════════════════════════════════════════

/**
 * Build the complete XMLDSig Signature block per ZATCA spec.
 *
 * @param invoiceDigest  Base64 SHA-256 of canonicalized invoice body
 * @param certBase64     Base64-encoded X.509 certificate (binarySecurityToken)
 * @param certDigest     Base64 SHA-256 of the raw certificate bytes
 * @param signingTime    ISO 8601 timestamp
 * @param privateKey     Raw 32-byte private key
 */
async function buildXmlDsig(
  invoiceDigest: string,
  certBase64: string,
  certDigest: string,
  signingTime: string,
  privateKey: Uint8Array,
): Promise<string> {
  // ── 1. Build SignedProperties ──
  const signedProperties = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01011/v1.3.2#" Id="xadesSignedProperties">
<xades:SignedSignatureProperties>
<xades:SigningTime>${signingTime}</xades:SigningTime>
<xades:SigningCertificate>
<xades:Cert>
<xades:CertDigest>
<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>
<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigest}</ds:DigestValue>
</xades:CertDigest>
<xades:IssuerSerial>
<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">CN=ZATCA-SubCA</ds:X509IssuerName>
<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">0</ds:X509SerialNumber>
</xades:IssuerSerial>
</xades:Cert>
</xades:SigningCertificate>
</xades:SignedSignatureProperties>
</xades:SignedProperties>`;

  // ── 2. Hash SignedProperties ──
  const propsCanon = c14n(signedProperties);
  const propsDigest = await sha256Base64(propsCanon);

  // ── 3. Build SignedInfo ──
  const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:CanonicalizationMethod>
<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"></ds:SignatureMethod>
<ds:Reference Id="invoiceSignedData" URI="">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
<ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath>
</ds:Transform>
<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
<ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath>
</ds:Transform>
<ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:Transform>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>
<ds:DigestValue>${invoiceDigest}</ds:DigestValue>
</ds:Reference>
<ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>
<ds:DigestValue>${propsDigest}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;

  // ── 4. Sign canonicalized SignedInfo with ECDSA ──
  const signedInfoCanon = c14n(signedInfo);
  const signedInfoHash = sha256Bytes(new TextEncoder().encode(signedInfoCanon));
  const signatureValue = signEcdsa(signedInfoHash, privateKey);

  // ── 5. Assemble full ds:Signature ──
  return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
${signedInfo}
<ds:SignatureValue>${signatureValue}</ds:SignatureValue>
<ds:KeyInfo>
<ds:X509Data>
<ds:X509Certificate>${certBase64}</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>
<ds:Object>
<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01011/v1.3.2#" Target="signature">
${signedProperties}
</xades:QualifyingProperties>
</ds:Object>
</ds:Signature>`;
}

// ═══════════════════════════════════════════════════════════════
// ZATCA QR TLV (GAP-5 + GAP-10)
// ═══════════════════════════════════════════════════════════════

function berLength(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function encodeTLV(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  const lenBytes = berLength(valueBytes.length);
  const tlv = new Uint8Array(1 + lenBytes.length + valueBytes.length);
  tlv[0] = tag;
  tlv.set(lenBytes, 1);
  tlv.set(valueBytes, 1 + lenBytes.length);
  return tlv;
}

function generateZatcaQrTLV(
  sellerName: string, vatNumber: string, timestamp: string,
  totalWithVat: number, vatAmount: number,
): string {
  const entries = [
    encodeTLV(1, sellerName), encodeTLV(2, vatNumber),
    encodeTLV(3, timestamp), encodeTLV(4, totalWithVat.toFixed(2)),
    encodeTLV(5, vatAmount.toFixed(2)),
  ];
  const total = entries.reduce((s, e) => s + e.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const e of entries) { buf.set(e, off); off += e.length; }
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

// ═══════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════

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

    const xml = inv.zatca_xml;
    if (!xml) {
      return json({ error: "يجب توليد XML أولاً قبل التوقيع" }, 400, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // Step 1: Invoice Digest (strip UBLExtensions + cac:Signature → C14N → SHA-256)
    // ════════════════════════════════════════════════════════════
    let xmlForHash = xml;
    xmlForHash = xmlForHash.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");
    xmlForHash = xmlForHash.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");
    const invoiceCanon = c14n(xmlForHash);
    const invoiceDigest = await sha256Base64(invoiceCanon);

    // ════════════════════════════════════════════════════════════
    // Step 2: Get certificate + private key
    // ════════════════════════════════════════════════════════════
    const { data: certData } = await admin.rpc("get_active_zatca_certificate");
    let certificate = "";
    let privateKeyRaw: Uint8Array | null = null;

    if (certData && !certData.error) {
      certificate = certData.certificate || "";
      const pk = certData.private_key || "";
      if (pk) privateKeyRaw = hexToBytes(pk);
    }

    // ════════════════════════════════════════════════════════════
    // Step 3: Build full XMLDSig Signature
    // ════════════════════════════════════════════════════════════
    let signedXml = xml;
    let isSigned = false;

    if (privateKeyRaw && certificate) {
      const signingTime = new Date().toISOString();

      // Certificate digest: SHA-256 of raw cert bytes
      const certBytes = Uint8Array.from(atob(certificate), c => c.charCodeAt(0));
      const certDigest = await sha256BytesBase64(certBytes);

      // Build complete XMLDSig block
      const dsigBlock = await buildXmlDsig(
        invoiceDigest, certificate, certDigest, signingTime, privateKeyRaw,
      );

      // Inject into UBLExtensions placeholder
      signedXml = signedXml.replace(
        /(<ext:ExtensionContent>)\s*(?:<!--[\s\S]*?-->)?\s*(<\/ext:ExtensionContent>)/,
        `$1\n${dsigBlock}\n$2`,
      );
      isSigned = true;
    }

    // ════════════════════════════════════════════════════════════
    // Step 4: Inject QR TLV (GAP-5)
    // ════════════════════════════════════════════════════════════
    try {
      const { data: settingsRows } = await admin.from("app_settings").select("key, value")
        .in("key", ["waqf_name", "vat_number"]);
      const qs: Record<string, string> = {};
      (settingsRows || []).forEach((s: { key: string; value: string }) => { qs[s.key] = s.value; });

      const qrTlv = generateZatcaQrTLV(
        qs.waqf_name || "", qs.vat_number || "",
        inv.created_at ? new Date(String(inv.created_at)).toISOString() : new Date().toISOString(),
        Number(inv.amount) || 0, Number(inv.vat_amount) || 0,
      );
      signedXml = signedXml.replace(
        /(<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">)\s*(?:<!--[^>]*-->)?\s*(<\/cbc:EmbeddedDocumentBinaryObject>)/,
        `$1${qrTlv}$2`,
      );
    } catch (qrErr) {
      console.error("QR TLV warning:", qrErr);
    }

    // ════════════════════════════════════════════════════════════
    // Step 5: Atomic ICV allocation (GAP-11)
    // ════════════════════════════════════════════════════════════
    const { data: chainResult, error: chainErr } = await admin.rpc("allocate_icv_and_chain", {
      p_invoice_id: invoice_id,
      p_invoice_hash: invoiceDigest,
    });

    if (chainErr) {
      console.error("Chain allocation error:", chainErr);
      return json({ error: "فشل تخصيص رقم التسلسل" }, 500, corsHeaders);
    }

    const icv = chainResult.icv;
    const previousHash = chainResult.previous_hash;

    // ════════════════════════════════════════════════════════════
    // Step 6: Save signed XML + hash + ICV
    // ════════════════════════════════════════════════════════════
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
      signed: isSigned,
    }, 200, corsHeaders);

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
