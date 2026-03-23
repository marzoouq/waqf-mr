/**
 * ZATCA Invoice Signer — Full XMLDSig (GAP-1 fix)
 *
 * Flow:
 *  1. Allocate ICV atomically first
 *  2. Inject ICV into XML → Strip UBLExtensions + cac:Signature → C14N → SHA-256 → invoiceDigest
 *  3. Build xades:SignedProperties (cert hash, signing time, X509IssuerSerial from cert) → C14N → SHA-256 → propsDigest
 *  4. Build ds:SignedInfo (invoiceDigest + propsDigest) → C14N → SHA-256 → sign ECDSA
 *  5. Assemble full ds:Signature block → inject into UBLExtensions
 *  6. Inject QR TLV (with TaxInclusiveAmount) → save
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
  c = c.replace(/>\s+</g, (_match) => {
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

/** Sign hash with ECDSA P-256 (prime256v1) → base64 DER */
function signEcdsa(messageHash: Uint8Array, privateKeyRaw: Uint8Array): string {
  const sig = p256.sign(messageHash, privateKeyRaw);
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
// X.509 Certificate Parsing (extract IssuerName + SerialNumber)
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a base64-encoded X.509 certificate to extract Issuer DN and Serial Number.
 * Uses lightweight ASN.1 DER parsing (no external library needed).
 */
function parseX509IssuerSerial(certBase64: string): { issuerName: string; serialNumber: string } {
  const defaultResult = { issuerName: "CN=ZATCA-SubCA", serialNumber: "0" };
  
  try {
    const certDer = Uint8Array.from(atob(certBase64), c => c.charCodeAt(0));
    
    // ASN.1 DER parsing helpers
    function readTag(data: Uint8Array, offset: number): { tag: number; length: number; valueOffset: number; totalLength: number } {
      if (offset >= data.length) throw new Error("EOF");
      const tag = data[offset];
      const lenOffset = offset + 1;
      let length = data[lenOffset];
      let valueOffset: number;
      
      if (length & 0x80) {
        const numBytes = length & 0x7f;
        length = 0;
        for (let i = 0; i < numBytes; i++) {
          length = (length << 8) | data[lenOffset + 1 + i];
        }
        valueOffset = lenOffset + 1 + numBytes;
      } else {
        valueOffset = lenOffset + 1;
      }
      
      return { tag, length, valueOffset, totalLength: valueOffset - offset + length };
    }
    
    // Navigate: SEQUENCE (Certificate) → SEQUENCE (TBSCertificate)
    const cert = readTag(certDer, 0);
    if (cert.tag !== 0x30) return defaultResult;
    
    const tbs = readTag(certDer, cert.valueOffset);
    if (tbs.tag !== 0x30) return defaultResult;
    
    let pos = tbs.valueOffset;
    
    // Skip version if present (context tag [0])
    let field = readTag(certDer, pos);
    if (field.tag === 0xa0) {
      pos += field.totalLength;
      field = readTag(certDer, pos);
    }
    
    // Serial Number (INTEGER)
    if (field.tag !== 0x02) return defaultResult;
    const serialBytes = certDer.slice(field.valueOffset, field.valueOffset + field.length);
    // Convert to decimal string
    let serialBigInt = 0n;
    for (let i = 0; i < serialBytes.length; i++) {
      serialBigInt = (serialBigInt << 8n) | BigInt(serialBytes[i]);
    }
    const serialNumber = serialBigInt.toString();
    pos += field.totalLength;
    
    // Skip Algorithm Identifier (SEQUENCE)
    field = readTag(certDer, pos);
    pos += field.totalLength;
    
    // Issuer (SEQUENCE of SETs of SEQUENCE of OID + value)
    field = readTag(certDer, pos);
    if (field.tag !== 0x30) return { issuerName: defaultResult.issuerName, serialNumber };
    
    const issuerEnd = field.valueOffset + field.length;
    let issuerPos = field.valueOffset;
    const rdns: string[] = [];
    
    // OID to name mapping
    const oidNames: Record<string, string> = {
      "2.5.4.3": "CN",
      "2.5.4.6": "C",
      "2.5.4.7": "L",
      "2.5.4.8": "ST",
      "2.5.4.10": "O",
      "2.5.4.11": "OU",
      "2.5.4.5": "SERIALNUMBER",
      "1.2.840.113549.1.9.1": "E",
    };
    
    while (issuerPos < issuerEnd) {
      const set = readTag(certDer, issuerPos);
      if (set.tag !== 0x31) break;
      
      const seq = readTag(certDer, set.valueOffset);
      if (seq.tag !== 0x30) { issuerPos += set.totalLength; continue; }
      
      // OID
      const oid = readTag(certDer, seq.valueOffset);
      if (oid.tag !== 0x06) { issuerPos += set.totalLength; continue; }
      
      // Decode OID
      const oidBytes = certDer.slice(oid.valueOffset, oid.valueOffset + oid.length);
      const oidParts: number[] = [Math.floor(oidBytes[0] / 40), oidBytes[0] % 40];
      let val = 0;
      for (let i = 1; i < oidBytes.length; i++) {
        val = (val << 7) | (oidBytes[i] & 0x7f);
        if (!(oidBytes[i] & 0x80)) { oidParts.push(val); val = 0; }
      }
      const oidStr = oidParts.join(".");
      
      // Value (UTF8String, PrintableString, etc.)
      const valField = readTag(certDer, oid.valueOffset + oid.totalLength);
      const decoder = new TextDecoder();
      const valStr = decoder.decode(certDer.slice(valField.valueOffset, valField.valueOffset + valField.length));
      
      const name = oidNames[oidStr] || oidStr;
      rdns.push(`${name}=${valStr}`);
      
      issuerPos += set.totalLength;
    }
    
    const issuerName = rdns.join(", ");
    return { issuerName: issuerName || defaultResult.issuerName, serialNumber };
    
  } catch (e) {
    console.error("X.509 parse error (using defaults):", e);
    return defaultResult;
  }
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
  // Extract real IssuerName and SerialNumber from certificate
  const { issuerName, serialNumber } = parseX509IssuerSerial(certBase64);

  // ── 1. Build SignedProperties ──
  const signedProperties = `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="xadesSignedProperties">
<xades:SignedSignatureProperties>
<xades:SigningTime>${signingTime}</xades:SigningTime>
<xades:SigningCertificate>
<xades:Cert>
<xades:CertDigest>
<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>
<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigest}</ds:DigestValue>
</xades:CertDigest>
<xades:IssuerSerial>
<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerName}</ds:X509IssuerName>
<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serialNumber}</ds:X509SerialNumber>
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
<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116">
<ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath>
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
<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">
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

function encodeTLVBytes(tag: number, value: Uint8Array): Uint8Array {
  const lenBytes = berLength(value.length);
  const tlv = new Uint8Array(1 + lenBytes.length + value.length);
  tlv[0] = tag;
  tlv.set(lenBytes, 1);
  tlv.set(value, 1 + lenBytes.length);
  return tlv;
}

function generateZatcaQrTLV(
  sellerName: string, vatNumber: string, timestamp: string,
  totalWithVat: number, vatAmount: number,
  signatureBytes?: Uint8Array, publicKeyBytes?: Uint8Array,
  certSignatureBytes?: Uint8Array, certPublicKeyBytes?: Uint8Array,
): string {
  const entries = [
    encodeTLV(1, sellerName), encodeTLV(2, vatNumber),
    encodeTLV(3, timestamp), encodeTLV(4, totalWithVat.toFixed(2)),
    encodeTLV(5, vatAmount.toFixed(2)),
  ];

  // Tags 6-9 for Standard invoices (Phase 2)
  if (signatureBytes) entries.push(encodeTLVBytes(6, signatureBytes));
  if (publicKeyBytes) entries.push(encodeTLVBytes(7, publicKeyBytes));
  if (certSignatureBytes) entries.push(encodeTLVBytes(8, certSignatureBytes));
  if (certPublicKeyBytes) entries.push(encodeTLVBytes(9, certPublicKeyBytes));

  const total = entries.reduce((s, e) => s + e.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const e of entries) { buf.set(e, off); off += e.length; }
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

// ═══════════════════════════════════════════════════════════════
// Certificate DER Parsing — Extract Signature + SubjectPublicKey
// ═══════════════════════════════════════════════════════════════

/**
 * Extract the signatureValue and subjectPublicKeyInfo from an X.509 DER certificate.
 * - Tag 8 (certSignature): The raw signature bytes (last BitString in cert)
 * - Tag 9 (certPublicKey): The SubjectPublicKeyInfo bytes from tbsCertificate
 */
function extractCertSignatureAndPublicKey(certDer: Uint8Array): { signature: Uint8Array; publicKey: Uint8Array } {
  // ASN.1 DER reader
  function readTlv(data: Uint8Array, offset: number): { tag: number; length: number; valueOffset: number; totalLength: number } {
    const tag = data[offset];
    const lenOffset = offset + 1;
    let length = data[lenOffset];
    let valueOffset: number;
    if (length & 0x80) {
      const numBytes = length & 0x7f;
      length = 0;
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | data[lenOffset + 1 + i];
      }
      valueOffset = lenOffset + 1 + numBytes;
    } else {
      valueOffset = lenOffset + 1;
    }
    return { tag, length, valueOffset, totalLength: valueOffset - offset + length };
  }

  try {
    // Certificate = SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
    const cert = readTlv(certDer, 0); // outer SEQUENCE
    let pos = cert.valueOffset;

    // tbsCertificate (SEQUENCE)
    const tbs = readTlv(certDer, pos);
    pos += tbs.totalLength;

    // signatureAlgorithm (SEQUENCE) — skip
    const sigAlg = readTlv(certDer, pos);
    pos += sigAlg.totalLength;

    // signatureValue (BIT STRING)
    const sigBitString = readTlv(certDer, pos);
    // Skip the first byte (unused bits indicator) of BitString
    const signatureBytes = certDer.slice(sigBitString.valueOffset + 1, sigBitString.valueOffset + sigBitString.length);

    // Now extract SubjectPublicKeyInfo from tbsCertificate
    let tbsPos = tbs.valueOffset;

    // Skip version [0] if present
    let field = readTlv(certDer, tbsPos);
    if (field.tag === 0xa0) { tbsPos += field.totalLength; field = readTlv(certDer, tbsPos); }

    // Skip serialNumber (INTEGER)
    tbsPos += field.totalLength;

    // Skip signature algorithm (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip issuer (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip validity (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // Skip subject (SEQUENCE)
    field = readTlv(certDer, tbsPos);
    tbsPos += field.totalLength;

    // SubjectPublicKeyInfo (SEQUENCE) — this is what we need for Tag 9
    field = readTlv(certDer, tbsPos);
    const publicKeyInfoBytes = certDer.slice(tbsPos, tbsPos + field.totalLength);

    return { signature: signatureBytes, publicKey: publicKeyInfoBytes };
  } catch (e) {
    console.error("extractCertSignatureAndPublicKey error:", e);
    // Fallback: return empty arrays
    return { signature: new Uint8Array(0), publicKey: new Uint8Array(0) };
  }
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

    // 1. Required fields
    if (!inv.amount && inv.amount !== 0) validationErrors.push("مبلغ الفاتورة مطلوب");
    if (inv.vat_amount === null || inv.vat_amount === undefined) validationErrors.push("مبلغ الضريبة مطلوب");
    if (!inv.zatca_uuid) validationErrors.push("معرّف UUID للفاتورة مطلوب");

    // 2. Amount consistency: TaxInclusive = TaxExclusive + VAT
    const amountExclVat = Number(inv.amount_excluding_vat ?? inv.amount) || 0;
    const vatAmt = Number(inv.vat_amount) || 0;
    const totalAmt = Number(inv.amount) || 0;
    if (Math.abs((amountExclVat + vatAmt) - totalAmt) > 0.01 && inv.amount_excluding_vat !== null && inv.amount_excluding_vat !== undefined) {
      validationErrors.push(`عدم اتساق المبالغ: المبلغ بدون ضريبة (${amountExclVat}) + الضريبة (${vatAmt}) ≠ الإجمالي (${totalAmt})`);
    }

    // 3. XML has required ZATCA elements
    if (!xml.includes("<cbc:ID>ICV</cbc:ID>")) validationErrors.push("XML يفتقر لعنصر ICV");
    if (!xml.includes("<ext:UBLExtensions>")) validationErrors.push("XML يفتقر لعنصر UBLExtensions");

    if (validationErrors.length > 0) {
      return json({ error: "فشل التحقق قبل التوقيع", validation_errors: validationErrors }, 422, corsHeaders);
    }

    // ════════════════════════════════════════════════════════════
    // Step 1: Atomic ICV allocation FIRST (before hashing)
    // ════════════════════════════════════════════════════════════
    const placeholderHash = "PENDING";
    const { data: chainResult, error: chainErr } = await admin.rpc("allocate_icv_and_chain", {
      p_invoice_id: invoice_id,
      p_invoice_hash: placeholderHash,
      p_source_table: table,
    });

    if (chainErr) {
      console.error("Chain allocation error:", chainErr);
      return json({ error: "فشل تخصيص رقم التسلسل" }, 500, corsHeaders);
    }

    const icv = chainResult.icv;
    const previousHash = chainResult.previous_hash;

    // Wrap signing in try/catch — rollback invoice_chain on failure
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
      // GAP: Also strip QR AdditionalDocumentReference (matches 3rd XPath Transform)
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

      // Block signing without a real certificate
      if (!privateKeyRaw || !certificate || certificate.startsWith("PLACEHOLDER")) {
        // Rollback: delete the chain record
        await admin.from("invoice_chain").delete()
          .eq("invoice_id", invoice_id).eq("icv", icv);
        return json({ error: "لا توجد شهادة ZATCA نشطة حقيقية. أكمل عملية الربط (Onboarding) أولاً." }, 400, corsHeaders);
      }

      // ════════════════════════════════════════════════════════════
      // Step 5: Build full XMLDSig Signature
      // ════════════════════════════════════════════════════════════
      let signedXml = xml;
      const signingTime = new Date().toISOString();

      // Certificate digest: SHA-256 of raw cert bytes
      const certBytes = Uint8Array.from(atob(certificate), c => c.charCodeAt(0));
      const certDigest = await sha256BytesBase64(certBytes);

      // Build complete XMLDSig block (with dynamic X509IssuerSerial from cert)
      const dsigBlock = await buildXmlDsig(
        invoiceDigest, certificate, certDigest, signingTime, privateKeyRaw,
      );

      // Inject into UBLExtensions placeholder
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

        // Determine if Standard invoice → include Tags 6-9
        const invoiceType = inv.invoice_type || "simplified";
        const isStandard = invoiceType === "standard" || invoiceType === "388";

        let sigBytes: Uint8Array | undefined;
        let pubKeyBytes: Uint8Array | undefined;
        let certSigBytes: Uint8Array | undefined;
        let certPubKeyBytes: Uint8Array | undefined;

        if (isStandard && certificate && privateKeyRaw) {
          try {
            // Tag 7: Public key from our keypair
            pubKeyBytes = p256.getPublicKey(privateKeyRaw, false);

            // Tag 6: Digital signature (from signed XML)
            const signedInfoMatch = signedXml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/);
            if (signedInfoMatch) {
              sigBytes = Uint8Array.from(atob(signedInfoMatch[1]), c => c.charCodeAt(0));
            }

            // Tags 8-9: Extract from certificate DER structure
            const extracted = extractCertSignatureAndPublicKey(certBytes);
            certSigBytes = extracted.signature;
            certPubKeyBytes = extracted.publicKey;
          } catch (tagErr) {
            console.error("Tags 6-9 extraction warning:", tagErr);
          }
        }

        // QR Tag 3: Use invoice issue date + time (not created_at) per ZATCA spec
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
      // Step 7: Update chain with real hash + Save signed XML
      // ════════════════════════════════════════════════════════════
      await admin.from("invoice_chain")
        .update({ invoice_hash: invoiceDigest })
        .eq("invoice_id", invoice_id)
        .eq("icv", icv);

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
      // Rollback: delete the PENDING chain record to avoid breaking PIH
      console.error("Signing failed, rolling back ICV chain:", signErr);
      try {
        await admin.from("invoice_chain").delete()
          .eq("invoice_id", invoice_id).eq("icv", icv);
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      return json({ error: `فشل التوقيع: ${signErr instanceof Error ? signErr.message : "خطأ غير معروف"}` }, 500, corsHeaders);
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
