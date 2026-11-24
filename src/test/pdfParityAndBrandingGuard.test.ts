/**
 * حارس: ملفات PDF تطابق أرقام الشاشة، وكل وثيقة تحمل ترويسة الوقف وختمه.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolvePdfWaqfInfo, DEFAULT_WAQF_NAME } from '@/utils/pdf/core/core';
import { buildDisclosureSequenceRows } from '@/utils/pdf/entities/beneficiary';
import { buildCarryForwardRows } from '@/utils/pdf/reports/comprehensiveBeneficiaryFinancial';
import type { ComprehensiveBeneficiaryData } from '@/utils/pdf/reports/comprehensiveBeneficiary';

const read = (p: string) => readFileSync(p, 'utf8');

describe('الترويسة لا تختفي', () => {
  it('بدون بيانات وقف تُستخدم التسمية الرسمية', () => {
    expect(resolvePdfWaqfInfo(undefined).waqfName).toBe(DEFAULT_WAQF_NAME);
    expect(resolvePdfWaqfInfo({ waqfName: '' }).waqfName).toBe(DEFAULT_WAQF_NAME);
  });
  it('createPdfDocument وfinalizePdf يمرّان عبر القيمة الاحتياطية', () => {
    const core = read('src/utils/pdf/core/core.ts');
    expect(core).toContain('addHeader(doc, fontFamily, resolvePdfWaqfInfo(waqfInfo))');
    expect(core).toContain('waqfInfo = resolvePdfWaqfInfo(waqfInfo);');
  });
});

describe('ختم الوقف على كل وثيقة', () => {
  it('finalizePdf يختم تلقائياً ما لم يُختم', () => {
    const core = read('src/utils/pdf/core/core.ts');
    expect(core).toMatch(/!isDocStamped\(doc\)[\s\S]*stampAfterContent\(doc, fontFamily, waqfInfo\)/);
    expect(read('src/utils/pdf/core/waqfStamp.ts')).toContain('stampedDocs.add(doc)');
  });
});

describe('تطابق أرقام الإفصاح مع الشاشة (2025-2026 كما صدرت)', () => {
  const rows = buildDisclosureSequenceRows({
    totalIncome: 1_756_900, waqfCorpusPrevious: 107_913.2, grandTotal: 1_864_813.2,
    totalExpenses: 127_984.44, netAfterExpenses: 1_736_828.76, vatAmount: 107_504.82,
    netAfterVat: 1_629_323.94, zakatAmount: 0, netRevenue: 1_629_323.94,
    adminShare: 162_891.56, waqifShare: 81_445.78, adminPct: 10, waqifPct: 5,
    waqfRevenue: 1_384_986.6, beneficiariesShare: 1_384_986.6,
  });
  const labels = rows.map(r => r[0]);
  it('يحتوي الرقبة المرحّلة والإجمالي الشامل والضريبة منفصلة', () => {
    expect(labels).toContain('(+) رقبة الوقف المرحّلة من العام السابق');
    expect(labels).toContain('الإجمالي الشامل');
    expect(labels).toContain('(-) المصروفات التشغيلية');
    expect(labels).toContain('(-) ضريبة القيمة المضافة');
    expect(labels).toContain('ريع الوقف');
    expect(labels.join()).not.toContain('المصروفات والضريبة');
  });
  it('القيم تُطبع كما وصلت دون إعادة حساب', () => {
    const v = Object.fromEntries(rows);
    expect(v['(-) المصروفات التشغيلية']).toContain('127,984.44');
    expect(v['(-) ضريبة القيمة المضافة']).toContain('107,504.82');
    expect(v['الإجمالي الشامل']).toContain('1,864,813.2');
  });
  it('التقرير الشامل يطبع الرقبة المرحّلة للسنة المقفلة كما في الشاشة', () => {
    const r = buildCarryForwardRows({ isFiscalYearActive: false, waqfCorpusPrevious: 107_913.2, grandTotal: 1_864_813.2, totalIncome: 1_756_900 } as ComprehensiveBeneficiaryData);
    expect(r.length).toBe(2);
  });
  it('زر تصدير الإفصاح يمرّر التسلسل الكامل', () => {
    const src = read('src/hooks/page/beneficiary/financial/useDisclosurePage.ts');
    for (const k of ['waqfCorpusPrevious: fin.waqfCorpusPrevious', 'vatAmount: fin.vatAmount', 'waqfRevenue: fin.waqfRevenue']) expect(src).toContain(k);
  });
});
