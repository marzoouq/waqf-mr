import { describe, it, expect } from 'vitest';
import { generateZatcaQrTLV } from './zatcaQr';

/**
 * Parse BER-encoded length from bytes at given offset.
 * Returns [length, bytesConsumed].
 */
function parseBerLength(bytes: Uint8Array, offset: number): [number, number] {
  const first = bytes[offset];
  if (first < 128) return [first, 1];
  if (first === 0x81) return [bytes[offset + 1], 2];
  if (first === 0x82) return [((bytes[offset + 1]) << 8) | bytes[offset + 2], 3];
  throw new Error(`Unsupported BER length byte: 0x${first.toString(16)}`);
}

function parseTLV(base64: string): Array<{ tag: number; value: string }> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const entries: Array<{ tag: number; value: string }> = [];
  let offset = 0;
  while (offset < bytes.length) {
    const tag = bytes[offset];
    const [len, lenSize] = parseBerLength(bytes, offset + 1);
    const valueStart = offset + 1 + lenSize;
    const value = new TextDecoder().decode(bytes.slice(valueStart, valueStart + len));
    entries.push({ tag, value });
    offset = valueStart + len;
  }
  return entries;
}

describe('generateZatcaQrTLV', () => {
  const sampleData = {
    sellerName: 'وقف الخير',
    vatNumber: '300000000000003',
    timestamp: '2025-01-15T12:00:00Z',
    totalWithVat: 1150.00,
    vatAmount: 150.00,
  };

  it('returns a non-empty base64 string', () => {
    const result = generateZatcaQrTLV(sampleData);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(() => atob(result)).not.toThrow();
  });

  it('encodes all 5 TLV tags', () => {
    const entries = parseTLV(generateZatcaQrTLV(sampleData));
    expect(entries.map(e => e.tag)).toEqual([1, 2, 3, 4, 5]);
  });

  it('encodes seller name correctly (tag 1)', () => {
    const entries = parseTLV(generateZatcaQrTLV(sampleData));
    expect(entries[0].value).toBe('وقف الخير');
  });

  it('formats amounts with 2 decimal places', () => {
    const data = { ...sampleData, totalWithVat: 100, vatAmount: 15 };
    const entries = parseTLV(generateZatcaQrTLV(data));
    expect(entries[3].value).toBe('100.00');
    expect(entries[4].value).toBe('15.00');
  });

  it('handles seller name > 127 bytes (GAP-10)', () => {
    const longName = 'مؤسسة الأوقاف الخيرية لإدارة وتطوير الممتلكات العقارية والاستثمارية في المملكة العربية السعودية';
    const data = { ...sampleData, sellerName: longName };
    const result = generateZatcaQrTLV(data);

    // Must still produce valid base64
    expect(() => atob(result)).not.toThrow();

    // Must parse back correctly
    const entries = parseTLV(result);
    expect(entries[0].tag).toBe(1);
    expect(entries[0].value).toBe(longName);
    expect(entries.length).toBe(5);
  });

  it('handles value exactly 128 bytes', () => {
    // 'a' repeated to make exactly 128 bytes
    const val128 = 'a'.repeat(128);
    const data = { ...sampleData, sellerName: val128 };
    const entries = parseTLV(generateZatcaQrTLV(data));
    expect(entries[0].value).toBe(val128);
  });

  it('handles value > 255 bytes', () => {
    const val300 = 'b'.repeat(300);
    const data = { ...sampleData, sellerName: val300 };
    const entries = parseTLV(generateZatcaQrTLV(data));
    expect(entries[0].value).toBe(val300);
    expect(entries.length).toBe(5);
  });
});
