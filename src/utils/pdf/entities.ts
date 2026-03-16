import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { maskBankAccount, maskNationalId } from '@/utils/maskData';
import {
  PdfWaqfInfo, UnitPdfRow, loadArabicFont, addHeader, addHeaderToAllPages, addFooter,
  TABLE_HEAD_GREEN, TABLE_HEAD_GOLD,
  baseTableStyles, headStyles, footStyles,
} from './core';

export const generatePropertiesPDF = async (properties: Array<{ property_number: string; property_type: string; location: string; area: number; description?: string | null }>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير العقارات', 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'رقم العقار', 'النوع', 'الموقع', 'المساحة (م²)', 'الوصف']],
    body: properties.map((p, i) => [
      i + 1,
      p.property_number,
      p.property_type,
      p.location,
      p.area.toString(),
      p.description || '-',
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('properties-report.pdf');
};

export const generateContractsPDF = async (contracts: Array<{ contract_number: string; tenant_name: string; start_date: string; end_date: string; rent_amount: number; status: string }>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير العقود', 105, startY + 5, { align: 'center' });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'pending': return 'معلق';
      default: return s;
    }
  };

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'رقم العقد', 'المستأجر', 'تاريخ البداية', 'تاريخ النهاية', 'قيمة الإيجار', 'الحالة']],
    body: contracts.map((c, i) => [
      i + 1,
      c.contract_number,
      c.tenant_name,
      c.start_date,
      c.end_date,
      `${safeNumber(c.rent_amount).toLocaleString()} ر.س`,
      statusLabel(c.status),
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('contracts-report.pdf');
};

export const generateBeneficiariesPDF = async (beneficiaries: Array<{ name: string; share_percentage: number; phone?: string | null; email?: string | null; bank_account?: string | null; national_id?: string | null }>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير المستفيدين', 105, startY + 5, { align: 'center' });

  const total = beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'الاسم', 'النسبة %', 'الهاتف', 'البريد', 'الحساب البنكي', 'رقم الهوية']],
    body: beneficiaries.map((b, i) => [
      i + 1,
      b.name,
      `${Number(b.share_percentage).toFixed(6)}%`,
      b.phone || '-',
      b.email || '-',
      b.bank_account ? maskBankAccount(b.bank_account) : '-',
      b.national_id ? maskNationalId(b.national_id) : '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toFixed(6)}%`, '', '', '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('beneficiaries-report.pdf');
};

export const generateUnitsPDF = async (
  propertyNumber: string,
  propertyLocation: string,
  units: UnitPdfRow[],
  waqfInfo?: PdfWaqfInfo
) => {
  const doc = new jsPDF('landscape');
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(`تقرير الوحدات السكنية - عقار ${propertyNumber}`, doc.internal.pageSize.width / 2, startY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(fontFamily, 'normal');
  doc.text(`الموقع: ${propertyLocation}`, doc.internal.pageSize.width / 2, startY + 14, { align: 'center' });

  // statusLabel removed — unit status is already in Arabic

  let totalMonthly = 0;
  let totalAnnual = 0;

  const body = units.map((u, i) => {
    const monthly = u.rent_amount || 0;
    const annual = monthly * 12;
    if (u.rent_amount) {
      totalMonthly += monthly;
      totalAnnual += annual;
    }
    return [
      i + 1,
      u.unit_number,
      u.unit_type,
      u.status,
      u.tenant_name || '-',
      u.start_date || '-',
      u.end_date || '-',
      u.rent_amount ? `${monthly.toLocaleString()}` : '-',
      u.rent_amount ? `${annual.toLocaleString()}` : '-',
      u.tenant_name ? `${u.paid_months}/${u.payment_type === 'monthly' ? 12 : u.payment_type === 'quarterly' ? 4 : (u.payment_type === 'semi_annual' || u.payment_type === 'semi-annual') ? 2 : u.payment_type === 'annual' ? 1 : u.payment_count || 12}` : '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 20,
    head: [['#', 'رقم الوحدة', 'النوع', 'الحالة', 'المستأجر', 'بداية العقد', 'نهاية العقد', 'الإيجار الشهري', 'الإيجار السنوي', 'الدفعات']],
    body,
    foot: [['', '', '', '', '', '', 'الإجمالي', `${totalMonthly.toLocaleString()}`, `${totalAnnual.toLocaleString()}`, '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`units-report-${propertyNumber}.pdf`);
};
