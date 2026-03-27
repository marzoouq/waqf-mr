import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { c14n } from "./xml-c14n.ts";

// ═══════════════════════════════════════════════════════════════
// Web Crypto Helpers (no npm dependencies needed)
// ═══════════════════════════════════════════════════════════════

async function sha256Base64(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return btoa(String.fromCharCode(...new Uint8Array(hash as ArrayBuffer)));
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Generate ECDSA P-256 key pair using Web Crypto */
async function generateEcdsaKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
}

/** Sign with ECDSA P-256 SHA-256 */
async function ecdsaSign(privateKey: CryptoKey, data: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    data.buffer as ArrayBuffer,
  );
}

/** Verify ECDSA P-256 SHA-256 */
async function ecdsaVerify(publicKey: CryptoKey, signature: ArrayBuffer, data: Uint8Array): Promise<boolean> {
  return await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    signature,
    data as unknown as BufferSource,
  );
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

// ═══════════════════════════════════════════════════════════════
// ECDSA Sign + Verify Round-Trip (Web Crypto)
// ═══════════════════════════════════════════════════════════════

Deno.test("ECDSA — sign and verify round-trip with P-256", async () => {
  const keyPair = await generateEcdsaKeyPair();
  const message = new TextEncoder().encode("فاتورة إيجار عقاري — اختبار التوقيع الرقمي");

  const signature = await ecdsaSign(keyPair.privateKey, message);
  assert(signature.byteLength > 0, "التوقيع يجب أن يكون غير فارغ");

  const verified = await ecdsaVerify(keyPair.publicKey, signature, message);
  assertEquals(verified, true, "يجب التحقق من التوقيع بنجاح");
});

Deno.test("ECDSA — different messages produce different signatures", async () => {
  const keyPair = await generateEcdsaKeyPair();
  const msg1 = new TextEncoder().encode("رسالة 1");
  const msg2 = new TextEncoder().encode("رسالة 2");

  const sig1 = await ecdsaSign(keyPair.privateKey, msg1);
  const sig2 = await ecdsaSign(keyPair.privateKey, msg2);

  const sig1B64 = btoa(String.fromCharCode(...new Uint8Array(sig1)));
  const sig2B64 = btoa(String.fromCharCode(...new Uint8Array(sig2)));
  assert(sig1B64 !== sig2B64, "توقيعات رسائل مختلفة يجب أن تكون مختلفة");
});

Deno.test("ECDSA — wrong key fails verification", async () => {
  const keyPair1 = await generateEcdsaKeyPair();
  const keyPair2 = await generateEcdsaKeyPair();

  const message = new TextEncoder().encode("test");
  const signature = await ecdsaSign(keyPair1.privateKey, message);

  const verified = await ecdsaVerify(keyPair2.publicKey, signature, message);
  assertEquals(verified, false, "التحقق بمفتاح خاطئ يجب أن يفشل");
});

Deno.test("ECDSA — tampered message fails verification", async () => {
  const keyPair = await generateEcdsaKeyPair();
  const original = new TextEncoder().encode("الرسالة الأصلية");
  const tampered = new TextEncoder().encode("رسالة مُعدّلة");

  const signature = await ecdsaSign(keyPair.privateKey, original);
  const verified = await ecdsaVerify(keyPair.publicKey, signature, tampered);
  assertEquals(verified, false, "رسالة مُعدّلة يجب أن تفشل في التحقق");
});

// ═══════════════════════════════════════════════════════════════
// ECDSA — Full ZATCA Signing Flow Simulation
// ═══════════════════════════════════════════════════════════════

Deno.test("ECDSA — full ZATCA signing flow: c14n → hash → sign → verify", async () => {
  const keyPair = await generateEcdsaKeyPair();

  // Simulate stripped invoice XML
  const invoiceBody = `<Invoice>
<cbc:ID>INV-001</cbc:ID>
<cbc:IssueDate>2026-03-15</cbc:IssueDate>
<cac:InvoiceLine>
<cbc:ID>1</cbc:ID>
<cbc:InvoicedQuantity unitCode="MON">1.000000</cbc:InvoicedQuantity>
<cbc:LineExtensionAmount currencyID="SAR">5000.00</cbc:LineExtensionAmount>
</cac:InvoiceLine>
</Invoice>`;

  // Step 1: C14N
  const canonicalized = c14n(invoiceBody);
  assert(!canonicalized.includes("<?xml"), "C14N يجب أن يزيل XML declaration");

  // Step 2: SHA-256 → base64 (invoiceDigest)
  const invoiceDigest = await sha256Base64(canonicalized);
  assert(invoiceDigest.length > 0, "invoiceDigest يجب أن يكون غير فارغ");

  // Step 3: Build SignedInfo
  const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"></ds:CanonicalizationMethod>
<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"></ds:SignatureMethod>
<ds:Reference Id="invoiceSignedData" URI="">
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>
<ds:DigestValue>${invoiceDigest}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;

  // Step 4: C14N SignedInfo → sign
  const signedInfoCanon = c14n(signedInfo);
  const signedInfoBytes = new TextEncoder().encode(signedInfoCanon);
  const signature = await ecdsaSign(keyPair.privateKey, signedInfoBytes);
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  assert(signatureB64.length > 0, "SignatureValue يجب أن يكون غير فارغ");

  // Step 5: Verify
  const verified = await ecdsaVerify(keyPair.publicKey, signature, signedInfoBytes);
  assertEquals(verified, true, "يجب التحقق من توقيع SignedInfo بنجاح");
});

Deno.test("ECDSA — invoice digest is deterministic", async () => {
  const xml = `<Invoice><cbc:ID>INV-DET</cbc:ID><cbc:Amount>1000</cbc:Amount></Invoice>`;
  const hash1 = await sha256Base64(c14n(xml));
  const hash2 = await sha256Base64(c14n(xml));
  assertEquals(hash1, hash2, "نفس XML يجب أن ينتج نفس الهاش دائماً");
});

// ═══════════════════════════════════════════════════════════════
// hexToBytes
// ═══════════════════════════════════════════════════════════════

Deno.test("hexToBytes — plain hex string", () => {
  const result = hexToBytes("0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20");
  assertEquals(result.length, 32);
  assertEquals(result[0], 1);
  assertEquals(result[31], 32);
});

Deno.test("hexToBytes — hex with 0x prefix", () => {
  const result = hexToBytes("0x" + "aa".repeat(32));
  assertEquals(result.length, 32);
  assertEquals(result[0], 0xaa);
});

Deno.test("hexToBytes — PEM-encoded (extracts last 32 bytes)", () => {
  const fakeKeyBytes = new Uint8Array(48);
  for (let i = 0; i < 48; i++) fakeKeyBytes[i] = i;
  let bin = "";
  for (let i = 0; i < fakeKeyBytes.length; i++) bin += String.fromCharCode(fakeKeyBytes[i]);
  const pem = `-----BEGIN EC PRIVATE KEY-----\n${btoa(bin)}\n-----END EC PRIVATE KEY-----`;

  const result = hexToBytes(pem);
  assertEquals(result.length, 32);
  assertEquals(result[0], 16);
  assertEquals(result[31], 47);
});

Deno.test("hexToBytes — base64 body without PEM headers", () => {
  const raw = new Uint8Array(64);
  for (let i = 0; i < 64; i++) raw[i] = i;
  let bin = "";
  for (let i = 0; i < raw.length; i++) bin += String.fromCharCode(raw[i]);
  const b64 = btoa(bin);
  const result = hexToBytes(b64);
  assertEquals(result.length, 32);
  assertEquals(result[0], 32);
  assertEquals(result[31], 63);
});

// ═══════════════════════════════════════════════════════════════
// BER Length Encoding
// ═══════════════════════════════════════════════════════════════

Deno.test("berLength — short form (< 128)", () => {
  assertEquals(Array.from(berLength(0)), [0]);
  assertEquals(Array.from(berLength(10)), [10]);
  assertEquals(Array.from(berLength(127)), [127]);
});

Deno.test("berLength — one-byte long form (128-255)", () => {
  assertEquals(Array.from(berLength(128)), [0x81, 128]);
  assertEquals(Array.from(berLength(200)), [0x81, 200]);
  assertEquals(Array.from(berLength(255)), [0x81, 255]);
});

Deno.test("berLength — two-byte long form (256+)", () => {
  assertEquals(Array.from(berLength(256)), [0x82, 1, 0]);
  assertEquals(Array.from(berLength(1000)), [0x82, 3, 232]);
});

// ═══════════════════════════════════════════════════════════════
// TLV Encoding
// ═══════════════════════════════════════════════════════════════

Deno.test("encodeTLV — Arabic seller name", () => {
  const tlv = encodeTLV(1, "وقف الخير");
  assertEquals(tlv[0], 1, "Tag يجب أن يكون 1");
  const decoder = new TextDecoder();
  const lenBytes = berLength(new TextEncoder().encode("وقف الخير").length);
  const valueStart = 1 + lenBytes.length;
  const value = decoder.decode(tlv.slice(valueStart));
  assertEquals(value, "وقف الخير");
});

Deno.test("encodeTLV — VAT number", () => {
  const tlv = encodeTLV(2, "300000000000003");
  assertEquals(tlv[0], 2);
  assertEquals(new TextDecoder().decode(tlv.slice(2)), "300000000000003");
});

Deno.test("encodeTLV — amount formatting", () => {
  const tlv = encodeTLV(4, (1150.50).toFixed(2));
  assertEquals(tlv[0], 4);
  assertEquals(new TextDecoder().decode(tlv.slice(2)), "1150.50");
});

// ═══════════════════════════════════════════════════════════════
// C14N + SHA-256 determinism & stability
// ═══════════════════════════════════════════════════════════════

Deno.test("C14N + SHA-256 — same XML produces same hash", async () => {
  const xml = `<?xml version="1.0"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>INV-001</cbc:ID>
  <!-- comment to remove -->
  <cbc:IssueDate>2026-01-01</cbc:IssueDate>
</Invoice>`;
  const hash1 = await sha256Base64(c14n(xml));
  const hash2 = await sha256Base64(c14n(xml));
  assertEquals(hash1, hash2);
});

Deno.test("C14N + SHA-256 — whitespace normalization", async () => {
  const xml1 = `<Invoice><cbc:ID>1</cbc:ID>   <cbc:Date>2026-01-01</cbc:Date></Invoice>`;
  const xml2 = `<Invoice>\n<cbc:ID>1</cbc:ID>\n\n<cbc:Date>2026-01-01</cbc:Date>\n</Invoice>`;
  const hash1 = await sha256Base64(c14n(xml1));
  const hash2 = await sha256Base64(c14n(xml2));
  assertEquals(hash1, hash2);
});

Deno.test("C14N + SHA-256 — different content → different hash", async () => {
  const hash1 = await sha256Base64(c14n(`<Invoice><cbc:ID>INV-001</cbc:ID></Invoice>`));
  const hash2 = await sha256Base64(c14n(`<Invoice><cbc:ID>INV-002</cbc:ID></Invoice>`));
  assert(hash1 !== hash2);
});

Deno.test("Invoice digest — stable when excluded sections change", async () => {
  function strip(xml: string): string {
    let x = xml;
    x = x.replace(/<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/g, "");
    x = x.replace(/<cac:Signature>[\s\S]*?<\/cac:Signature>/g, "");
    x = x.replace(/<cac:AdditionalDocumentReference>\s*<cbc:ID>QR<\/cbc:ID>[\s\S]*?<\/cac:AdditionalDocumentReference>/g, "");
    return c14n(x);
  }

  const xmlA = `<Invoice>
<ext:UBLExtensions><ext:ExtensionContent>SIG_A</ext:ExtensionContent></ext:UBLExtensions>
<cbc:ID>INV-001</cbc:ID>
<cac:Signature><cbc:ID>sig-a</cbc:ID></cac:Signature>
<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject>QR_A</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
<cac:InvoiceLine><cbc:ID>1</cbc:ID></cac:InvoiceLine>
</Invoice>`;

  const xmlB = xmlA.replace("SIG_A", "DIFFERENT").replace("sig-a", "x").replace("QR_A", "Y");
  const hashA = await sha256Base64(strip(xmlA));
  const hashB = await sha256Base64(strip(xmlB));
  assertEquals(hashA, hashB);
});
