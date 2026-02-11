import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Waqf info passed optionally to PDF generators
export interface PdfWaqfInfo {
  waqfName?: string;
  deedNumber?: string;
  court?: string;
  logoUrl?: string;
}

// Helper to load and register Amiri Arabic font
const loadArabicFont = async (doc: jsPDF) => {
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch('/fonts/Amiri-Regular.ttf'),
      fetch('/fonts/Amiri-Bold.ttf'),
    ]);

    const regularBuf = await regularRes.arrayBuffer();
    const boldBuf = await boldRes.arrayBuffer();

    const toBase64 = (buf: ArrayBuffer) => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    const regularBase64 = toBase64(regularBuf);
    const boldBase64 = toBase64(boldBuf);

    doc.addFileToVFS('Amiri-Regular.ttf', regularBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal', 'Identity-H');

    doc.addFileToVFS('Amiri-Bold.ttf', boldBase64);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold', 'Identity-H');

    doc.setFont('Amiri');
    doc.setLanguage('ar');
    return true;
  } catch (e) {
    console.warn('Failed to load Arabic font, falling back to helvetica:', e);
    doc.setFont('helvetica');
    return false;
  }
};

// Load logo as base64 data URL for embedding in PDF
const loadLogoBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Professional header with logo, waqf name, deed info, and gold separator
const addHeader = async (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo): Promise<number> => {
  if (!waqfInfo?.waqfName) return 15; // no header, return default startY

  const pageW = doc.internal.pageSize.width;
  const margin = 18;
  let currentY = 14;

  // Try to load and add logo
  if (waqfInfo.logoUrl) {
    const logoData = await loadLogoBase64(waqfInfo.logoUrl);
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', pageW - margin - 22, currentY - 6, 22, 22);
      } catch {
        // logo failed, continue without it
      }
    }
  }

  // Waqf name - centered bold
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(16);
  doc.text(waqfInfo.waqfName, pageW / 2, currentY + 4, { align: 'center' });
  currentY += 12;

  // Deed info - smaller text below name
  const deedParts: string[] = [];
  if (waqfInfo.deedNumber) deedParts.push(waqfInfo.deedNumber);
  if (waqfInfo.court) deedParts.push(waqfInfo.court);

  if (deedParts.length > 0) {
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(9);
    doc.text(deedParts.join('  -  '), pageW / 2, currentY + 2, { align: 'center' });
    currentY += 8;
  }

  // Gold separator line
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(0.8);
  doc.line(margin, currentY + 2, pageW - margin, currentY + 2);
  currentY += 8;

  return currentY;
};

// Add header to all pages (for multi-page documents created by autoTable)
const addHeaderToAllPages = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  if (!waqfInfo?.waqfName) return;
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    // Simplified header for continuation pages (no logo loading needed)
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    doc.text(waqfInfo.waqfName, pageW / 2, 12, { align: 'center' });
    doc.setDrawColor(202, 138, 4);
    doc.setLineWidth(0.5);
    doc.line(margin, 16, pageW - margin, 16);
  }
};

// Decorative border with outer gold frame, inner green frame, and corner ornaments
const addPageBorder = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  // Outer gold frame (1.5pt) at 8mm from edge
  doc.setDrawColor(202, 138, 4);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // Inner green frame (0.5pt) at 11mm from edge
  doc.setDrawColor(22, 101, 52);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  // Corner ornaments – small gold filled squares at four corners
  doc.setFillColor(202, 138, 4);
  const cs = 3; // corner square size
  // Top-left
  doc.rect(8, 8, cs, cs, 'F');
  // Top-right
  doc.rect(pageW - 8 - cs, 8, cs, cs, 'F');
  // Bottom-left
  doc.rect(8, pageH - 8 - cs, cs, cs, 'F');
  // Bottom-right
  doc.rect(pageW - 8 - cs, pageH - 8 - cs, cs, cs, 'F');
};

const addFooter = (doc: jsPDF, fontFamily: string, waqfInfo?: PdfWaqfInfo) => {
  const pageCount = doc.getNumberOfPages();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  const pageW = doc.internal.pageSize.width;
  const margin = 18;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.height;
    const footerY = pageH - 14;

    // Add decorative border to every page
    addPageBorder(doc);

    // Gray separator line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);

    doc.setFontSize(8);
    doc.setFont(fontFamily, 'normal');

    // Date on left
    doc.text(dateStr, margin, footerY, { align: 'left' });

    // Waqf name in center (short version)
    if (waqfInfo?.waqfName) {
      doc.text(waqfInfo.waqfName, pageW / 2, footerY, { align: 'center' });
    }

    // Page number on right
    doc.text(`${i} / ${pageCount}`, pageW - margin, footerY, { align: 'right' });
  }
};

// Shared table styles
const TABLE_HEAD_GREEN: [number, number, number] = [22, 101, 52];
const TABLE_HEAD_GOLD: [number, number, number] = [202, 138, 4];
const TABLE_HEAD_RED: [number, number, number] = [180, 40, 40];

const baseTableStyles = (fontFamily: string) => ({
  styles: { halign: 'right' as const, font: fontFamily, fontStyle: 'normal' as const, cellPadding: 4 },
});

const headStyles = (color: [number, number, number], fontFamily: string) => ({
  headStyles: { fillColor: color, font: fontFamily, fontStyle: 'bold' as const, cellPadding: 4 },
});

const footStyles = (color: [number, number, number], fontFamily: string) => ({
  footStyles: { fillColor: color, font: fontFamily, fontStyle: 'bold' as const, cellPadding: 4 },
});

// ==================== REPORT GENERATORS ====================

interface ReportData {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  expensesByType: Array<{ type: string; amount: number }>;
  incomeBySource: Array<{ source: string; amount: number }>;
  beneficiaries: Array<{
    name: string;
    percentage: number;
    amount: number;
  }>;
}

export const generateAnnualReportPDF = async (data: ReportData, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير الوقف السنوي', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البند', 'المبلغ (ر.س)']],
    body: [
      [{ content: '-- الإيرادات --', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 252, 231] } }],
      ...data.incomeBySource.map(i => [`  ${i.source}`, `+${i.amount.toLocaleString()}`]),
      [{ content: 'إجمالي الإيرادات', styles: { fontStyle: 'bold' } }, { content: `+${data.totalIncome.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
      [{ content: '-- المصروفات --', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226] } }],
      ...data.expensesByType.map(e => [`  ${e.type}`, `-${e.amount.toLocaleString()}`]),
      [{ content: 'إجمالي المصروفات', styles: { fontStyle: 'bold' } }, { content: `(${data.totalExpenses.toLocaleString()})`, styles: { fontStyle: 'bold' } }],
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', data.adminShare.toLocaleString()],
      ['حصة الواقف (5%)', data.waqifShare.toLocaleString()],
      ['ريع المستفيدين', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 100;

  doc.setFontSize(14);
  doc.setFont(fontFamily, 'bold');
  doc.text('توزيع حصص المستفيدين', 105, finalY + 15, { align: 'center' });

  autoTable(doc, {
    startY: finalY + 22,
    head: [['اسم المستفيد', 'النسبة %', 'المبلغ (ر.س)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${b.percentage}%`,
      b.amount.toLocaleString(),
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`waqf-report-${data.fiscalYear}.pdf`);
};

export const generateBeneficiaryStatementPDF = async (beneficiaryName: string, sharePercentage: number, shareAmount: number, fiscalYear: string, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('كشف حساب المستفيد', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${fiscalYear}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البيان', 'القيمة']],
    body: [
      ['اسم المستفيد', beneficiaryName],
      ['نسبة الحصة', `${sharePercentage}%`],
      ['مبلغ الحصة', `${shareAmount.toLocaleString()} ر.س`],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};

// ========== ENTITY PDF GENERATORS ==========

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
      `${Number(c.rent_amount).toLocaleString()} ر.س`,
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

export const generateIncomePDF = async (income: Array<{ source: string; amount: number; date: string; notes?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير الدخل', 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'المصدر', 'المبلغ', 'التاريخ', 'ملاحظات']],
    body: income.map((item, i) => [
      i + 1,
      item.source,
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.notes || '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toLocaleString()} ر.س`, '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('income-report.pdf');
};

export const generateExpensesPDF = async (expenses: Array<{ expense_type: string; amount: number; date: string; description?: string | null }>, total: number, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير المصروفات', 105, startY + 5, { align: 'center' });

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'النوع', 'المبلغ', 'التاريخ', 'الوصف']],
    body: expenses.map((item, i) => [
      i + 1,
      item.expense_type,
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.description || '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toLocaleString()} ر.س`, '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('expenses-report.pdf');
};

export const generateBeneficiariesPDF = async (beneficiaries: Array<{ name: string; share_percentage: number; phone?: string | null; email?: string | null; bank_account?: string | null; national_id?: string | null }>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير المستفيدين', 105, startY + 5, { align: 'center' });

  const total = beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'الاسم', 'النسبة %', 'الهاتف', 'البريد', 'الحساب البنكي']],
    body: beneficiaries.map((b, i) => [
      i + 1,
      b.name,
      `${Number(b.share_percentage).toFixed(2)}%`,
      b.phone || '-',
      b.email || '-',
      b.bank_account || '-',
    ]),
    foot: [['', 'الإجمالي', `${total.toFixed(2)}%`, '', '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...footStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('beneficiaries-report.pdf');
};

export const generateAccountsPDF = async (data: {
  contracts: Array<{ contract_number: string; tenant_name: string; rent_amount: number; status: string }>;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  beneficiaries: Array<{ name: string; share_percentage: number }>;
  vatAmount?: number;
  distributionsAmount?: number;
  waqfCapital?: number;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('الحسابات الختامية', 105, startY + 5, { align: 'center' });

  // Contracts
  doc.setFontSize(13);
  doc.text('العقود', 105, startY + 18, { align: 'center' });
  autoTable(doc, {
    startY: startY + 24,
    head: [['رقم العقد', 'المستأجر', 'الإيجار الشهري', 'السنوي']],
    body: data.contracts.map(c => [
      c.contract_number,
      c.tenant_name,
      `${Number(c.rent_amount).toLocaleString()}`,
      `${(Number(c.rent_amount) * 12).toLocaleString()}`,
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = (doc as any).lastAutoTable?.finalY + 10 || 100;

  // Income
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text('الإيرادات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المصدر', 'المبلغ']],
    body: Object.entries(data.incomeBySource).map(([s, a]) => [s, `+${a.toLocaleString()}`]),
    foot: [['الإجمالي', `+${data.totalIncome.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 150;

  // Expenses
  doc.setFont(fontFamily, 'bold');
  doc.text('المصروفات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['النوع', 'المبلغ']],
    body: Object.entries(data.expensesByType).map(([t, a]) => [t, `-${a.toLocaleString()}`]),
    foot: [['الإجمالي', `-${data.totalExpenses.toLocaleString()}`]],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...footStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 200;

  // Distribution
  const regularExp = data.totalExpenses - (data.vatAmount || 0);
  const netAfterExp = data.totalIncome - regularExp;
  const netAfterVat = netAfterExp - (data.vatAmount || 0);

  doc.setFont(fontFamily, 'bold');
  doc.text('التوزيع', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['البند', 'المبلغ']],
    body: [
      ['إجمالي الدخل', `+${data.totalIncome.toLocaleString()}`],
      ['(-) المصروفات (بدون الضريبة)', `(${regularExp.toLocaleString()})`],
      ['الصافي بعد المصاريف', netAfterExp.toLocaleString()],
      ['(-) ضريبة القيمة المضافة', `(${(data.vatAmount || 0).toLocaleString()})`],
      ['الصافي بعد خصم الضريبة', netAfterVat.toLocaleString()],
      ['(-) حصة الناظر (10%)', `(${data.adminShare.toLocaleString()})`],
      ['(-) حصة الواقف (5%)', `(${data.waqifShare.toLocaleString()})`],
      ['ريع الوقف', data.waqfRevenue.toLocaleString()],
      ['التوزيعات الفعلية', (data.distributionsAmount || 0).toLocaleString()],
      ['رقبة الوقف', (data.waqfCapital || 0).toLocaleString()],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 250;

  // Beneficiaries
  doc.setFont(fontFamily, 'bold');
  doc.text('حصص المستفيدين', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 6,
    head: [['المستفيد', 'النسبة', 'المبلغ']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${Number(b.share_percentage).toFixed(2)}%`,
      (data.waqfRevenue * Number(b.share_percentage) / 100).toLocaleString(),
    ]),
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GOLD, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('accounts-report.pdf');
};

export const generateMySharePDF = async (data: {
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  beneficiariesShare: number;
  distributions: Array<{ date: string; fiscalYear: string; amount: number; status: string }>;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير حصتي من الريع', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`المستفيد: ${data.beneficiaryName}`, 105, startY + 16, { align: 'center' });

  autoTable(doc, {
    startY: startY + 24,
    head: [['البيان', 'القيمة']],
    body: [
      ['نسبة الحصة', `${data.sharePercentage}%`],
      ['إجمالي ريع الوقف', `${data.netRevenue.toLocaleString()} ر.س`],
      ['(-) حصة الناظر (10%)', `${data.adminShare.toLocaleString()} ر.س`],
      ['(-) حصة الواقف (5%)', `${data.waqifShare.toLocaleString()} ر.س`],
      ['صافي ريع المستفيدين', `${data.beneficiariesShare.toLocaleString()} ر.س`],
      ['حصتي المستحقة', `${data.myShare.toLocaleString()} ر.س`],
      ['المبالغ المستلمة', `${data.totalReceived.toLocaleString()} ر.س`],
      ['المبالغ المعلقة', `${data.pendingAmount.toLocaleString()} ر.س`],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  if (data.distributions.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY + 15 || 120;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(14);
    doc.text('سجل التوزيعات', 105, finalY, { align: 'center' });

    autoTable(doc, {
      startY: finalY + 8,
      head: [['التاريخ', 'السنة المالية', 'المبلغ', 'الحالة']],
      body: data.distributions.map(d => [
        d.date,
        d.fiscalYear,
        `${d.amount.toLocaleString()} ر.س`,
        d.status === 'paid' ? 'مستلم' : 'معلق',
      ]),
      theme: 'striped',
      ...headStyles(TABLE_HEAD_GOLD, fontFamily),
      ...baseTableStyles(fontFamily),
    });
  }

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`my-share-${data.beneficiaryName}.pdf`);
};

export const generateDisclosurePDF = async (data: {
  fiscalYear: string;
  beneficiaryName: string;
  sharePercentage: number;
  myShare: number;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  beneficiariesShare: number;
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
}, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('الإفصاح السنوي', 105, startY + 5, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, startY + 16, { align: 'center' });

  // Income
  autoTable(doc, {
    startY: startY + 24,
    head: [['المصدر', 'المبلغ (ر.س)']],
    body: [
      ...Object.entries(data.incomeBySource).map(([source, amount]) => [source, `+${amount.toLocaleString()}`]),
      [{ content: 'إجمالي الإيرادات', styles: { fontStyle: 'bold' } }, { content: `+${data.totalIncome.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  let y = (doc as any).lastAutoTable?.finalY + 10 || 100;

  // Expenses
  autoTable(doc, {
    startY: y,
    head: [['النوع', 'المبلغ (ر.س)']],
    body: [
      ...Object.entries(data.expensesByType).map(([type, amount]) => [type, `-${amount.toLocaleString()}`]),
      [{ content: 'إجمالي المصروفات', styles: { fontStyle: 'bold' } }, { content: `-${data.totalExpenses.toLocaleString()}`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_RED, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 160;

  // Distribution
  autoTable(doc, {
    startY: y,
    head: [['البند', 'المبلغ (ر.س)']],
    body: [
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', `-${data.adminShare.toLocaleString()}`],
      ['حصة الواقف (5%)', `-${data.waqifShare.toLocaleString()}`],
      ['صافي ريع المستفيدين', data.beneficiariesShare.toLocaleString()],
      [{ content: `حصتي (${data.sharePercentage}%)`, styles: { fontStyle: 'bold' } }, { content: `${data.myShare.toLocaleString()} ر.س`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save(`disclosure-${data.fiscalYear}.pdf`);
};

export const generateInvoicesViewPDF = async (invoices: Array<{
  invoice_type: string;
  invoice_number: string | null;
  amount: number;
  date: string;
  property_number: string;
  status: string;
}>, waqfInfo?: PdfWaqfInfo) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  const startY = await addHeader(doc, fontFamily, waqfInfo);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(18);
  doc.text('تقرير الفواتير', 105, startY + 5, { align: 'center' });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'paid': return 'مدفوعة';
      case 'pending': return 'معلّقة';
      case 'cancelled': return 'ملغاة';
      default: return s;
    }
  };

  const total = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

  autoTable(doc, {
    startY: startY + 14,
    head: [['#', 'النوع', 'رقم الفاتورة', 'المبلغ', 'التاريخ', 'العقار', 'الحالة']],
    body: invoices.map((item, i) => [
      i + 1,
      item.invoice_type,
      item.invoice_number || '-',
      `${Number(item.amount).toLocaleString()} ر.س`,
      item.date,
      item.property_number || '-',
      statusLabel(item.status),
    ]),
    foot: [['', 'الإجمالي', '', `${total.toLocaleString()} ر.س`, '', '', '']],
    theme: 'striped',
    ...headStyles(TABLE_HEAD_GREEN, fontFamily),
    ...footStyles(TABLE_HEAD_GREEN, fontFamily),
    ...baseTableStyles(fontFamily),
  });

  addHeaderToAllPages(doc, fontFamily, waqfInfo);
  addFooter(doc, fontFamily, waqfInfo);
  doc.save('invoices-report.pdf');
};
