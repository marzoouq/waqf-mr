import { describe, it, expect } from 'vitest';
import { getLastAutoTableY } from './pdfHelpers';

describe('getLastAutoTableY', () => {
  it('returns finalY from lastAutoTable when present', () => {
    const doc = { lastAutoTable: { finalY: 150 } } as unknown as import('jspdf').default;
    expect(getLastAutoTableY(doc)).toBe(150);
  });

  it('returns fallback when lastAutoTable is absent', () => {
    const doc = {} as unknown as import('jspdf').default;
    expect(getLastAutoTableY(doc)).toBe(90); // default fallback
  });

  it('returns custom fallback when provided', () => {
    const doc = {} as unknown as import('jspdf').default;
    expect(getLastAutoTableY(doc, 200)).toBe(200);
  });
});
