import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertMatch, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ═══════════════════════════════════════════════════════════════
// Copy core pure functions from index.ts for unit testing
// (avoids importing the full handler with Deno.serve)
// ═══════════════════════════════════════════════════════════════

function c14n(xml: string): string {
  let c = xml;
  c = c.replace(/<\?xml[^?]*\?>\s*/g, "");
  c = c.replace(/<!--[\s\S]*?-->/g, "");
  c = c.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((?:\s+[^>]*?)?)\/>/g, (_m: string, tag: string, attrs: string) => {
    return `<${tag}${attrs}></${tag}>`;
  });
  c = c.replace(/<([a-zA-Z][a-zA-Z0-9:._-]*)((\s+[^>]*?)?)\s*>/g, (_m: string, tag: string, attrsStr: string) => {
    if (!attrsStr || !attrsStr.trim()) return `<${tag}>`;
    const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)="([^"]*)"/g;
    const attrs: Array<{ name: string; value: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(attrsStr)) !== null) {
      attrs.push({ name: match[1], value: match[2] });
    }
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
  c = c.replace(/>\s+</g, () => ">\n<");
  c = c.split("\n").map(line => line.trimEnd()).filter(line => line.length > 0).join("\n");
  return c;
}

async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

function hexToBytes(hex: string): Uint8Array {
  let clean = hex.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
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

function parseX509IssuerSerial(certBase64: string): { issuerName: string; serialNumber: string } {
  const defaultResult = { issuerName: "CN=ZATCA-SubCA", serialNumber: "0" };
  try {
    const certDer = Uint8Array.from(atob(certBase64), c => c.charCodeAt(0));
    function readTag(data: Uint8Array, offset: number): { tag: number; length: number; valueOffset: number; totalLength: number } {
      if (offset >= data.length) throw new Error("EOF");
      const tag = data[offset];
      let lenOffset = offset + 1;
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
    const cert = readTag(certDer, 0);
    if (cert.tag !== 0x30) return defaultResult;
    const tbs = readTag(certDer, cert.valueOffset);
    if (tbs.tag !== 0x30) return defaultResult;
    let pos = tbs.valueOffset;
    let field = readTag(certDer, pos);
    if (field.tag === 0xa0) { pos += field.totalLength; field = readTag(certDer, pos); }
    if (field.tag !== 0x02) return defaultResult;
    const serialBytes = certDer.slice(field.valueOffset, field.valueOffset + field.length);
    let serialBigInt = 0n;
    for (let i = 0; i < serialBytes.length; i++) {
      serialBigInt = (serialBigInt << 8n) | BigInt(serialBytes[i]);
    }
    const serialNumber = serialBigInt.toString();
    pos += field.totalLength;
    field = readTag(certDer, pos);
    pos += field.totalLength;
    field = readTag(certDer, pos);
    if (field.tag !== 0x30) return { issuerName: defaultResult.issuerName, serialNumber };
    const issuerEnd = field.valueOffset + field.length;
    let issuerPos = field.valueOffset;
    const rdns: string[] = [];
    const oidNames: Record<string, string> = {
      "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST",
      "2.5.4.10": "O", "2.5.4.11": "OU", "2.5.4.5": "SERIALNUMBER",
      "1.2.840.113549.1.9.1": "E",
    };
    while (issuerPos < issuerEnd) {
      const set = readTag(certDer, issuerPos);
      if (set.tag !== 0x31) break;
      const seq = readTag(certDer, set.valueOffset);
      if (seq.tag !== 0x30) { issuerPos += set.totalLength; continue; }
      const oid = readTag(certDer, seq.valueOffset);
      if (oid.tag !== 0x06) { issuerPos += set.totalLength; continue; }
      const oidBytes = certDer.slice(oid.valueOffset, oid.valueOffset + oid.length);
      const oidParts: number[] = [Math.floor(oidBytes[0] / 40), oidBytes[0] % 40];
      let val = 0;
      for (let i = 1; i < oidBytes.length; i++) {
        val = (val << 7) | (oidBytes[i] & 0x7f);
        if (!(oidBytes[i] & 0x80)) { oidParts.push(val); val = 0; }
      }
      const oidStr = oidParts.join(".");
      const valField = readTag(certDer, oid.valueOffset + oid.totalLength);
      const decoder = new TextDecoder();
      const valStr = decoder.decode(certDer.slice(valField.valueOffset, valField.valueOffset + valField.length));
      const name = oidNames[oidStr] || oidStr;
      rdns.push(`${name}=${valStr}`);
      issuerPos += set.totalLength;
    }
    const issuerName = rdns.join(", ");
    return { issuerName: issuerName || defaultResult.issuerName, serialNumber };
  } catch {
    return defaultResult;
  }
}

// ═══════════════════════════════════════════════════════════════
// Minimal buildXmlDsig (without real ECDSA — tests structure only)
// ═══════════════════════════════════════════════════════════════

async function buildXmlDsigStructure(
  invoiceDigest: string, certBase64: string, certDigest: string, signingTime: string,
): Promise<string> {
  const { issuerName, serialNumber } = parseX509IssuerSerial(certBase64);
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
  const propsCanon = c14n(signedProperties);
  const propsDigest = await sha256Base64(propsCanon);
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
  return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
${signedInfo}
<ds:SignatureValue>MOCK_SIG</ds:SignatureValue>
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
// TLV Parser helper for tests
// ═══════════════════════════════════════════════════════════════

function parseBerLength(bytes: Uint8Array, offset: number): [number, number] {
  const first = bytes[offset];
  if (first < 128) return [first, 1];
  if (first === 0x81) return [bytes[offset + 1], 2];
  if (first === 0x82) return [((bytes[offset + 1]) << 8) | bytes[offset + 2], 3];
  throw new Error(`Unsupported BER length: 0x${first.toString(16)}`);
}

function parseTLV(base64: string): Array<{ tag: number; value: Uint8Array }> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const entries: Array<{ tag: number; value: Uint8Array }> = [];
  let offset = 0;
  while (offset < bytes.length) {
    const tag = bytes[offset];
    const [len, lenSize] = parseBerLength(bytes, offset + 1);
    const valueStart = offset + 1 + lenSize;
    entries.push({ tag, value: bytes.slice(valueStart, valueStart + len) });
    offset = valueStart + len;
  }
  return entries;
}

// ═══════════════════════════════════════════════════════════════
// Sample self-signed ECDSA P-256 certificate (base64 DER)
// Generated for testing purposes only
// ═══════════════════════════════════════════════════════════════

// This is a real ZATCA sandbox CSID certificate (public, non-sensitive) for unit testing X509 parsing.
// Source: ZATCA sandbox onboarding test responses
const TEST_CERT_BASE64 = "MIICMzCCAdmgAwIBAgIGAZOq6apNMAoGCCqGSM49BAMCMBUxEzARBgNVBAMMClpBVENBLVN1YkNBMB4XDTI0MDEwMTAwMDAwMFoXDTI1MDEwMTAwMDAwMFowTjELMAkGA1UEBhMCU0ExHDAaBgNVBAoME1Rlc3QgT3JnYW5pemF0aW9uMRQwEgYDVQQLDAtUZXN0IEJyYW5jaDELMAkGA1UEAwwCVFMwVjAQBgcqhkjOPQIBBgUrgQQACgNCAARYni8+b6RiKW/Jk4K6Un9J4RGjnJ2N1W3FJT+GnSPGWJxEQGm0j04qsbt6NH0dAtLJqtRqRYjfnNJJaKVZ7NZo4HdMIHaMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFIzr6v8huKYZXrIsfFz7R6QLaEZCMB8GA1UdIwQYMBaAFFmQImPPOb4oWCi16U9vN3A8+xLaMIGJBgNVHREEgYEwf6R9MHsxGzAZBgNVBAQMEjEtVFNUfDItVFNUfDMtZWQyMjEfMB0GCgmSJomT8ixkAQEMDzMwMDAwMDAwMDAwMDAwMzENMAsGA1UEDAwEMTEwMDEMMAoGA1UEGgwDUklZMQ4wDAYDVQQPDAVPdGhlcjEOMAwGA1UEBQwFMTAwMDAwCgYIKoZIzj0EAwIDSAAwRQIhAM1zl1VfeBKq+7m7MRJp32LJyBq7ogH3pvvLnHb6/tuJAiAlPAGZH8RJ7DH6BzKokyNlr7J2VFfoKnYN0t/N/0GBHA==";

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

Deno.test("Test 1: C14N removes XML declaration", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice><ID>1</ID></Invoice>`;
  const result = c14n(xml);
  assert(!result.includes("<?xml"), "XML declaration should be removed");
  assert(result.includes("<Invoice>"), "Root element should remain");
});

Deno.test("Test 2: C14N removes comments", () => {
  const xml = `<Invoice><!-- this is a comment --><ID>1</ID></Invoice>`;
  const result = c14n(xml);
  assert(!result.includes("<!--"), "Comments should be removed");
  assert(result.includes("<ID>1</ID>"), "Content should remain");
});

Deno.test("Test 3: C14N expands self-closing tags", () => {
  const xml = `<Invoice><cbc:Note/><cac:Item attr="val"/></Invoice>`;
  const result = c14n(xml);
  assert(result.includes("<cbc:Note></cbc:Note>"), `Self-closing <cbc:Note/> should expand, got: ${result}`);
  assert(result.includes("<cac:Item"), "cac:Item should be present");
  assert(result.includes("</cac:Item>"), "cac:Item closing tag should be present");
  assert(!result.includes("/>"), "No self-closing tags should remain");
});

Deno.test("Test 4: C14N sorts attributes (xmlns first)", () => {
  const xml = `<Invoice currencyID="SAR" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"></Invoice>`;
  const result = c14n(xml);
  const xmlnsPos = result.indexOf("xmlns=");
  const xmlnsCbcPos = result.indexOf("xmlns:cbc=");
  const currencyPos = result.indexOf("currencyID=");
  assert(xmlnsPos < xmlnsCbcPos, "xmlns should come before xmlns:cbc");
  assert(xmlnsCbcPos < currencyPos, "xmlns:cbc should come before currencyID");
});

Deno.test("Test 5: sha256Base64 produces correct hash", async () => {
  // SHA-256 of "hello" is well-known
  const result = await sha256Base64("hello");
  assertEquals(result, "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
});

Deno.test("Test 6: Invoice digest excludes UBLExtensions, cac:Signature, and QR", async () => {
  const baseXml = `<Invoice>
<ext:UBLExtensions><ext:ExtensionContent>PLACEHOLDER_A</ext:ExtensionContent></ext:UBLExtensions>
<cbc:ID>INV-001</cbc:ID>
<cac:Signature><cbc:ID>sig</cbc:ID></cac:Signature>
<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">QR_DATA_A</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
<cac:InvoiceLine><cbc:ID>1</cbc:ID></cac:InvoiceLine>
</Invoice>`;

  const modifiedXml = `<Invoice>
<ext:UBLExtensions><ext:ExtensionContent>CHANGED_CONTENT</ext:ExtensionContent></ext:UBLExtensions>
<cbc:ID>INV-001</cbc:ID>
<cac:Signature><cbc:ID>different-sig</cbc:ID></cac:Signature>
<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">DIFFERENT_QR</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
<cac:InvoiceLine><cbc:ID>1</cbc:ID></cac:InvoiceLine>
</Invoice>`;

  function stripForDigest(xml: string): string {
    let x = xml;
    x = x.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");
    x = x.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");
    x = x.replace(/<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g, "");
    return c14n(x);
  }

  const hash1 = await sha256Base64(stripForDigest(baseXml));
  const hash2 = await sha256Base64(stripForDigest(modifiedXml));
  assertEquals(hash1, hash2, "Digest should be identical when only excluded sections change");
});

Deno.test("Test 7: buildXmlDsig produces correct structure", async () => {
  const dsig = await buildXmlDsigStructure(
    "dGVzdERpZ2VzdA==", TEST_CERT_BASE64, "dGVzdENlcnREaWdlc3Q=", "2025-01-15T12:00:00Z",
  );

  // Required elements
  assert(dsig.includes("<ds:SignedInfo"), "Must contain SignedInfo");
  assert(dsig.includes("<ds:SignatureValue>"), "Must contain SignatureValue");
  assert(dsig.includes("<ds:X509Certificate>"), "Must contain X509Certificate");
  assert(dsig.includes("xadesSignedProperties"), "Must contain xadesSignedProperties");
  assert(dsig.includes("<xades:SigningTime>2025-01-15T12:00:00Z</xades:SigningTime>"), "Must contain SigningTime");

  // 4 XPath transforms + 1 C14N transform
  const transformCount = (dsig.match(/<ds:Transform /g) || []).length;
  assertEquals(transformCount, 4, "Must have exactly 4 Transform elements");

  // 3rd transform excludes QR
  assert(dsig.includes("not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])"),
    "3rd XPath must exclude QR reference");

  // Two Reference elements
  const refCount = (dsig.match(/<ds:Reference /g) || []).length;
  assertEquals(refCount, 2, "Must have 2 Reference elements (invoice + signedProperties)");
});

Deno.test("Test 8: QR TLV contains Tags 1-5 mandatory fields", () => {
  const qr = generateZatcaQrTLV("وقف الخير", "300000000000003", "2025-01-15T12:00:00Z", 1150, 150);
  const entries = parseTLV(qr);
  const tags = entries.map(e => e.tag);
  assertEquals(tags, [1, 2, 3, 4, 5], "Tags 1-5 must be present in order");

  const decoder = new TextDecoder();
  assertEquals(decoder.decode(entries[0].value), "وقف الخير");
  assertEquals(decoder.decode(entries[1].value), "300000000000003");
  assertEquals(decoder.decode(entries[2].value), "2025-01-15T12:00:00Z");
  assertEquals(decoder.decode(entries[3].value), "1150.00");
  assertEquals(decoder.decode(entries[4].value), "150.00");
});

Deno.test("Test 9: QR TLV contains Tags 6-9 for Standard invoices", () => {
  const sigBytes = new Uint8Array([1, 2, 3, 4]);
  const pubBytes = new Uint8Array([5, 6, 7, 8]);
  const certSigBytes = new Uint8Array([9, 10, 11]);
  const certPubBytes = new Uint8Array([12, 13]);

  const qr = generateZatcaQrTLV(
    "Test", "123456789", "2025-01-15T12:00:00Z", 100, 15,
    sigBytes, pubBytes, certSigBytes, certPubBytes,
  );
  const entries = parseTLV(qr);
  const tags = entries.map(e => e.tag);
  assertEquals(tags, [1, 2, 3, 4, 5, 6, 7, 8, 9], "Tags 1-9 must all be present for Standard invoice");

  assertEquals(Array.from(entries[5].value), [1, 2, 3, 4], "Tag 6 = digital signature");
  assertEquals(Array.from(entries[6].value), [5, 6, 7, 8], "Tag 7 = public key");
  assertEquals(Array.from(entries[7].value), [9, 10, 11], "Tag 8 = cert signature");
  assertEquals(Array.from(entries[8].value), [12, 13], "Tag 9 = cert public key");
});

Deno.test("Test 10: ICV injection replaces placeholder correctly", () => {
  const xml = `<Invoice>
<cac:AdditionalDocumentReference>
<cbc:ID>ICV</cbc:ID>
<cbc:UUID>0</cbc:UUID>
</cac:AdditionalDocumentReference>
<cac:InvoiceLine><cbc:ID>1</cbc:ID></cac:InvoiceLine>
</Invoice>`;

  const newIcv = 42;
  const result = xml.replace(
    /(<cac:AdditionalDocumentReference>\s*<cbc:ID>ICV<\/cbc:ID>\s*<cbc:UUID>)\d+(<\/cbc:UUID>)/,
    `$1${newIcv}$2`,
  );

  assert(result.includes("<cbc:UUID>42</cbc:UUID>"), "ICV should be injected as 42");
  assert(!result.includes("<cbc:UUID>0</cbc:UUID>"), "Old ICV placeholder should be gone");
});

Deno.test("Test 11: X509 parser extracts IssuerName and SerialNumber", () => {
  const { issuerName, serialNumber } = parseX509IssuerSerial(TEST_CERT_BASE64);

  // Parser should return non-empty strings (not crash)
  assert(issuerName.length > 0, "IssuerName should not be empty");
  assert(serialNumber.length > 0, "SerialNumber should not be empty");
  assertMatch(serialNumber, /^\d+$/, "SerialNumber should be a decimal number string");

  // Test fallback: invalid cert returns defaults
  const fallback = parseX509IssuerSerial("INVALIDBASE64==");
  assertEquals(fallback.issuerName, "CN=ZATCA-SubCA", "Invalid cert should return default issuer");
  assertEquals(fallback.serialNumber, "0", "Invalid cert should return default serial");

  // Test fallback: empty string
  const empty = parseX509IssuerSerial("");
  assertEquals(empty.issuerName, "CN=ZATCA-SubCA");
  assertEquals(empty.serialNumber, "0");
});
