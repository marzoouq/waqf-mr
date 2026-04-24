/**
 * QR TLV builder (ZATCA Phase 2 — supports tags 6-9 for Standard invoices)
 */

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

export function generateZatcaQrTLV(
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
