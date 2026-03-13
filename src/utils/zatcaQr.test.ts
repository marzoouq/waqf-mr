import { describe, it, expect } from 'vitest';
import { generateZatcaQrTLV } from './zatcaQr';

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
    // Valid base64
    expect(() => atob(result)).not.toThrow();
  });

  it('encodes all 5 TLV tags', () => {
    const result = generateZatcaQrTLV(sampleData);
    const binary = atob(result);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Parse TLV tags
    const tags: number[] = [];
    let offset = 0;
    while (offset < bytes.length) {
      const tag = bytes[offset];
      const len = bytes[offset + 1];
      tags.push(tag);
      offset += 2 + len;
    }
    expect(tags).toEqual([1, 2, 3, 4, 5]);
  });

  it('encodes seller name correctly (tag 1)', () => {
    const result = generateZatcaQrTLV(sampleData);
    const binary = atob(result);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Tag 1 starts at offset 0
    expect(bytes[0]).toBe(1);
    const len = bytes[1];
    const decoded = new TextDecoder().decode(bytes.slice(2, 2 + len));
    expect(decoded).toBe('وقف الخير');
  });

  it('formats amounts with 2 decimal places', () => {
    const data = { ...sampleData, totalWithVat: 100, vatAmount: 15 };
    const result = generateZatcaQrTLV(data);
    const binary = atob(result);
    // Find tag 4 (total) and verify it contains "100.00"
    expect(binary).toContain('100.00');
    expect(binary).toContain('15.00');
  });
});
