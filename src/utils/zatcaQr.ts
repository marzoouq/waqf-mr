/**
 * ZATCA QR Code TLV Base64 Generator
 * Generates TLV (Tag-Length-Value) encoded Base64 string per ZATCA e-invoicing requirements.
 * Tags 1-5: Seller Name, VAT Number, Timestamp, Total (incl. VAT), VAT Amount
 */
import QRCode from 'qrcode';

interface ZatcaQrData {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601
  totalWithVat: number;
  vatAmount: number;
}

/**
 * Encode a single TLV entry
 */
function encodeTLV(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const tlv = new Uint8Array(2 + valueBytes.length);
  tlv[0] = tag;
  tlv[1] = valueBytes.length;
  tlv.set(valueBytes, 2);
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
