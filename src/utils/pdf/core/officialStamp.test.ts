import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { applyOfficialMarks } from './officialStamp';
import { setDocumentRegistrar } from './officialRegistry';

describe('applyOfficialMarks', () => {
  it('registers the document and prints its reference on every page', async () => {
    let seen: { docType: string; pageCount: number; contentHash: string } | null = null;
    setDocumentRegistrar(async (input) => {
      seen = input;
      return { docNumber: 'RPT-2026-000042', verificationCode: 'a'.repeat(24), issuedAt: '2026-11-04T10:00:00Z' };
    });
    const doc = new jsPDF();
    doc.text('page 1', 20, 40);
    doc.addPage();
    const ref = await applyOfficialMarks(doc, 'helvetica', 'annual-disclosure-2025-2026.pdf');
    setDocumentRegistrar(null);
    expect(ref?.docNumber).toBe('RPT-2026-000042');
    expect(seen).toMatchObject({ docType: 'annual_disclosure', pageCount: 2 });
    expect(seen!.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('still lets the file download when registration fails', async () => {
    setDocumentRegistrar(async () => { throw new Error('offline'); });
    const ref = await applyOfficialMarks(new jsPDF(), 'helvetica', 'x.pdf');
    setDocumentRegistrar(null);
    expect(ref).toBeNull();
  });
});
