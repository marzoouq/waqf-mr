// autoTable is dynamically imported inside each function
import { maskBankAccount, maskNationalId } from '@/utils/format/maskData';
import { safeNumber } from '@/utils/format/safeNumber';
import {
  PdfWaqfInfo, UnitPdfRow, createPdfDocument, finalizePdf,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
  reshapeArabic as rs, reshapeRow,
  fmtDate,
} from '../core/core';
import { getEffectiveContractStatus, getContractStatusInfo } from '@/utils/contracts/contractStatus';
import { getLastAutoTableY } from '@/utils/pdf/core/pdfHelpers';
import type { PdfExportContext, PropertyPdfInput } from '@/types/pdfExports';
import { fmt, fmtInt } from '@/utils/format/format';

export const generatePropertiesPDF = async (properties: PropertyPdfInput[], waqfInfo?: PdfWaqfInfo, context?: PdfExportContext) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير العقارات'), 105, startY + 5, { align: 'center' });
  if (context?.fiscalYearLabel) doc.text(context.fiscalYearLabel, 105, startY + 12, { align: 'center' });

  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['#', 'رقم العقار', 'النوع', 'الموقع', 'المساحة (م²)', 'الوحدات', 'الإشغال %', 'الإيراد التعاقدي', 'المصروفات التشغيلية', 'صافي الدخل'])],
    body: properties.map((p, i) => reshapeRow([
      i + 1,
      p.property_number,
      p.property_type,
      p.location,
      p.area.toString(),
      p.financials?.totalUnits ?? '—', p.financials?.occupancy ?? '—',
      p.financials ? fmt(p.financials.contractualRevenue) : '—',
      p.financials ? fmt(p.financials.totalExpenses) : '—',
      p.financials ? fmt(p.financials.netIncome) : '—',
    ])),
    foot: [reshapeRow(['', `${properties.length} عقار`, '', '', fmt(properties.reduce((sum, p) => sum + safeNumber(p.area), 0)), '', '', '', '', ''])],
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, 'properties-report.pdf', waqfInfo);
};

export const generateContractsPDF = async (contracts: Array<{ contract_number: string; tenant_name: string; start_date: string; end_date: string; rent_amount: number; status: string }>, waqfInfo?: PdfWaqfInfo, context?: PdfExportContext) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير العقود'), 105, startY + 5, { align: 'center' });

  if (context?.fiscalYearLabel) doc.text(context.fiscalYearLabel, 105, startY + 12, { align: 'center' });
  autoTable(doc, {
    startY: startY + 18,
    body: [reshapeRow(['عدد العقود', `${contracts.length}`]),
      reshapeRow(['نشطة', `${contracts.filter(c => getEffectiveContractStatus(c.status, c.end_date) === 'active').length}`]),
      reshapeRow(['منتهية', `${contracts.filter(c => getEffectiveContractStatus(c.status, c.end_date) === 'expired').length}`]),
      ...(context?.totalRent !== undefined ? [reshapeRow(['الإيرادات التعاقدية — حصة السنة كما في الشاشة', fmt(context.totalRent)])] : [])],
    ...baseTableStyles(fontFamily),
  });
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  autoTable(doc, {
    startY: getLastAutoTableY(doc, startY + 60) + 8,
    head: [reshapeRow(['#', 'رقم العقد', 'المستأجر', 'تاريخ البداية', 'تاريخ النهاية', 'قيمة الإيجار', 'الحالة'])],
    body: contracts.map((c, i) => {
      const effective = getEffectiveContractStatus(c.status, c.end_date);
      const isExpiringSoon = effective === 'active' && !!c.end_date && new Date(c.end_date) <= in90Days;
      const statusText = isExpiringSoon ? `${getContractStatusInfo(effective).label} ⚠` : getContractStatusInfo(effective).label;
      return reshapeRow([
        i + 1,
        c.contract_number,
        c.tenant_name,
        fmtDate(c.start_date),
        fmtDate(c.end_date),
        `${fmt(safeNumber(c.rent_amount))} ر.س`,
        statusText,
      ]);
    }),
    foot: [reshapeRow(['', 'الإجمالي السنوي للعقود', '', '', '', fmt(contracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0)), `${contracts.length} عقد`])],
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, 'contracts-report.pdf', waqfInfo);
};

export const generateBeneficiariesPDF = async (beneficiaries: Array<{ name: string; share_percentage: number; phone?: string | null; email?: string | null; bank_account?: string | null; national_id?: string | null }>, waqfInfo?: PdfWaqfInfo, context?: PdfExportContext) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text(rs('تقرير المستفيدين'), 105, startY + 5, { align: 'center' });
  if (context?.filterLabel) doc.text(rs(context.filterLabel), 105, startY + 12, { align: 'center' });

  const total = beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [reshapeRow(['#', 'الاسم', 'النسبة %', 'الاستحقاق', 'الهاتف', 'البريد', 'الحساب البنكي', 'رقم الهوية'])],
    body: beneficiaries.map((b, i) => reshapeRow([
      i + 1,
      b.name,
      `${Number(b.share_percentage).toFixed(6)}%`,
      safeNumber(b.share_percentage) > 0 ? 'مستحق' : 'دون نسبة',
      b.phone || '-',
      b.email || '-',
      b.bank_account ? maskBankAccount(b.bank_account) : '-',
      b.national_id ? maskNationalId(b.national_id) : '-',
    ])),
    foot: [reshapeRow(['', 'الإجمالي', `${total.toFixed(6)}%`, '', '', '', '', ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, 'beneficiaries-report.pdf', waqfInfo);
};

export const generateUnitsPDF = async (
  propertyNumber: string,
  propertyLocation: string,
  units: UnitPdfRow[],
  waqfInfo?: PdfWaqfInfo
) => {
  const { default: autoTable } = await import('jspdf-autotable');
  const { doc, fontFamily, startY } = await createPdfDocument(waqfInfo, 'landscape');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(rs(`تقرير الوحدات السكنية - عقار ${propertyNumber}`), doc.internal.pageSize.width / 2, startY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(fontFamily, 'normal');
  doc.text(rs(`الموقع: ${propertyLocation}`), doc.internal.pageSize.width / 2, startY + 14, { align: 'center' });

  let totalMonthly = 0;
  let totalAnnual = 0;

  const body = units.map((u, i) => {
    const annual = u.rent_amount || 0;
    const monthly = annual / 12;
    if (u.rent_amount) {
      totalMonthly += monthly;
      totalAnnual += annual;
    }
    return reshapeRow([
      i + 1,
      u.unit_number,
      u.unit_type,
      u.status,
      u.end_date ? getContractStatusInfo(getEffectiveContractStatus(u.contract_status ?? 'active', u.end_date)).label : '—',
      u.tenant_name || '-',
      u.start_date || '-',
      u.end_date || '-',
      u.rent_amount ? fmtInt(monthly) : '-',
      u.rent_amount ? fmtInt(annual) : '-',
      u.tenant_name ? `${u.paid_months}/${u.payment_type === 'monthly' ? 12 : u.payment_type === 'quarterly' ? 4 : (u.payment_type === 'semi_annual' || u.payment_type === 'semi-annual') ? 2 : u.payment_type === 'annual' ? 1 : u.payment_count || 12}` : '-',
    ]);
  });

  autoTable(doc, {
    startY: startY + 20,
    head: [reshapeRow(['#', 'رقم الوحدة', 'النوع', 'حالة الوحدة', 'حالة العقد', 'المستأجر', 'بداية العقد', 'نهاية العقد', 'الإيجار الشهري', 'الإيجار السنوي', 'الدفعات'])],
    body,
    foot: [reshapeRow(['', '', '', '', '', '', '', 'الإجمالي', fmtInt(totalMonthly), fmtInt(totalAnnual), ''])],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  return finalizePdf(doc, fontFamily, `units-report-${propertyNumber}.pdf`, waqfInfo);
};
