/**
 * XMLDSig builder for ZATCA invoices + crypto helpers (SHA-256 + ECDSA P-256)
 */
import { p256 } from "npm:@noble/curves@1.4.0/p256";
import { sha256 } from "npm:@noble/hashes@1.4.0/sha256";
import { c14n } from "../_shared/xml-c14n.ts";
import { parseX509IssuerSerial } from "./x509-parser.ts";

// ═══════════════════════════════════════════════════════════════
// Cryptographic Helpers
// ═══════════════════════════════════════════════════════════════

/** SHA-256 → base64 */
export async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** SHA-256 → Uint8Array (for ECDSA signing) */
export function sha256Bytes(data: Uint8Array): Uint8Array {
  return sha256(data);
}

/** SHA-256 of raw bytes → base64 */
export async function sha256BytesBase64(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/** Sign hash with ECDSA P-256 (prime256v1) → base64 DER */
export function signEcdsa(messageHash: Uint8Array, privateKeyRaw: Uint8Array): string {
  const sig = p256.sign(messageHash, privateKeyRaw);
  return btoa(String.fromCharCode(...sig.toDERRawBytes()));
}

export function hexToBytes(hex: string): Uint8Array {
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
export async function buildXmlDsig(
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
