/**
 * ZATCA QR Code TLV Base64 Generator
 * Generates TLV (Tag-Length-Value) encoded Base64 string per ZATCA e-invoicing requirements.
 * Tags 1-5: Seller Name, VAT Number, Timestamp, Total (incl. VAT), VAT Amount
 *
 * GAP-10 FIX: Supports value lengths > 127 bytes using multi-byte BER length encoding.
 */
import QRCode from 'qrcode';

interface ZatcaQrData {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601
  totalWithVat: number;
  vatAmount: number;
  // Tags 6-9 for Standard invoices (Phase 2)
  digitalSignature?: Uint8Array;
  publicKey?: Uint8Array;
  certificateSignature?: Uint8Array;
  certificatePublicKey?: Uint8Array;
}

/**
 * Encode length in BER (Basic Encoding Rules) format.
 * - 0-127   → single byte
 * - 128-255 → 0x81, length
 * - 256+    → 0x82, high byte, low byte
 */
function berLength(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

/**
 * Encode a single TLV entry with multi-byte length support
 */
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

/**
 * Encode a TLV entry from raw bytes (for Tags 6-9)
 */
function encodeTLVBytes(tag: number, value: Uint8Array): Uint8Array {
  const lenBytes = berLength(value.length);
  const tlv = new Uint8Array(1 + lenBytes.length + value.length);
  tlv[0] = tag;
  tlv.set(lenBytes, 1);
  tlv.set(value, 1 + lenBytes.length);
  return tlv;
}

/**
 * Generate ZATCA-compliant TLV Base64 string for QR code
 */
export function generateZatcaQrTLV(data: ZatcaQrData): string {
  const entries = [
    encodeTLV(1, data.sellerName),
    encodeTLV(2, data.vatNumber),
    encodeTLV(3, data.timestamp),
    encodeTLV(4, data.totalWithVat.toFixed(2)),
    encodeTLV(5, data.vatAmount.toFixed(2)),
  ];

  // Tags 6-9 for Standard invoices (Phase 2)
  if (data.digitalSignature) entries.push(encodeTLVBytes(6, data.digitalSignature));
  if (data.publicKey) entries.push(encodeTLVBytes(7, data.publicKey));
  if (data.certificateSignature) entries.push(encodeTLVBytes(8, data.certificateSignature));
  if (data.certificatePublicKey) entries.push(encodeTLVBytes(9, data.certificatePublicKey));

  // Concatenate all TLV entries
  const totalLength = entries.reduce((sum, e) => sum + e.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const entry of entries) {
    result.set(entry, offset);
    offset += entry.length;
  }

  // Convert to Base64
  let binary = '';
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

/**
 * Generate a real QR code as a data URL (PNG) using the qrcode library
 */
export async function generateQrDataUrl(data: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(data, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}
