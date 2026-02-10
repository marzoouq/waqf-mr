import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to load and register Amiri Arabic font
const loadArabicFont = async (doc: jsPDF) => {
  try {
    const [regularRes, boldRes] = await Promise.all([
      fetch('/fonts/Amiri-Regular.ttf'),
      fetch('/fonts/Amiri-Bold.ttf'),
    ]);

    const regularBuf = await regularRes.arrayBuffer();
    const boldBuf = await boldRes.arrayBuffer();

    // Convert ArrayBuffer to base64
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
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

    doc.addFileToVFS('Amiri-Bold.ttf', boldBase64);
    doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

    doc.setFont('Amiri');
    return true;
  } catch (e) {
    console.warn('Failed to load Arabic font, falling back to helvetica:', e);
    doc.setFont('helvetica');
    return false;
  }
};

const addFooter = (doc: jsPDF, fontFamily: string) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont(fontFamily, 'normal');
    doc.text(
      `صفحة ${i} من ${pageCount} - تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
};

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

export const generateAnnualReportPDF = async (data: ReportData) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';
  
  // Title
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير الوقف السنوي', 105, 20, { align: 'center' });
  
  // Fiscal Year
  doc.setFontSize(12);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${data.fiscalYear}`, 105, 35, { align: 'center' });
  
  // Summary Table
  autoTable(doc, {
    startY: 45,
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
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });
  
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  
  doc.setFontSize(14);
  doc.setFont(fontFamily, 'bold');
  doc.text('توزيع حصص المستفيدين', 105, finalY + 20, { align: 'center' });
  
  autoTable(doc, {
    startY: finalY + 30,
    head: [['اسم المستفيد', 'النسبة %', 'المبلغ (ر.س)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${b.percentage}%`,
      b.amount.toLocaleString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });
  
  addFooter(doc, fontFamily);
  doc.save(`waqf-report-${data.fiscalYear}.pdf`);
};

export const generateBeneficiaryStatementPDF = async (beneficiaryName: string, sharePercentage: number, shareAmount: number, fiscalYear: string) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';
  
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('كشف حساب المستفيد', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(fontFamily, 'normal');
  doc.text(`السنة المالية: ${fiscalYear}`, 105, 35, { align: 'center' });
  
  autoTable(doc, {
    startY: 50,
    head: [['البيان', 'القيمة']],
    body: [
      ['اسم المستفيد', beneficiaryName],
      ['نسبة الحصة', `${sharePercentage}%`],
      ['مبلغ الحصة', `${shareAmount.toLocaleString()} ر.س`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });
  
  addFooter(doc, fontFamily);
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};

// ========== NEW PDF GENERATORS ==========

export const generatePropertiesPDF = async (properties: Array<{ property_number: string; property_type: string; location: string; area: number; description?: string | null }>) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير العقارات', 105, 20, { align: 'center' });

  autoTable(doc, {
    startY: 35,
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
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
  doc.save('properties-report.pdf');
};

export const generateContractsPDF = async (contracts: Array<{ contract_number: string; tenant_name: string; start_date: string; end_date: string; rent_amount: number; status: string }>) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير العقود', 105, 20, { align: 'center' });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'pending': return 'معلق';
      default: return s;
    }
  };

  autoTable(doc, {
    startY: 35,
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
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
  doc.save('contracts-report.pdf');
};

export const generateIncomePDF = async (income: Array<{ source: string; amount: number; date: string; notes?: string | null }>, total: number) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير الدخل', 105, 20, { align: 'center' });

  autoTable(doc, {
    startY: 35,
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
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
  doc.save('income-report.pdf');
};

export const generateExpensesPDF = async (expenses: Array<{ expense_type: string; amount: number; date: string; description?: string | null }>, total: number) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير المصروفات', 105, 20, { align: 'center' });

  autoTable(doc, {
    startY: 35,
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
    headStyles: { fillColor: [220, 38, 38], font: fontFamily, fontStyle: 'bold' },
    footStyles: { fillColor: [220, 38, 38], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
  doc.save('expenses-report.pdf');
};

export const generateBeneficiariesPDF = async (beneficiaries: Array<{ name: string; share_percentage: number; phone?: string | null; email?: string | null; bank_account?: string | null; national_id?: string | null }>) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('تقرير المستفيدين', 105, 20, { align: 'center' });

  const total = beneficiaries.reduce((s, b) => s + Number(b.share_percentage), 0);

  autoTable(doc, {
    startY: 35,
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
    headStyles: { fillColor: [202, 138, 4], font: fontFamily, fontStyle: 'bold' },
    footStyles: { fillColor: [202, 138, 4], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
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
}) => {
  const doc = new jsPDF();
  const hasArabic = await loadArabicFont(doc);
  const fontFamily = hasArabic ? 'Amiri' : 'helvetica';

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(20);
  doc.text('الحسابات الختامية', 105, 20, { align: 'center' });

  // Contracts
  doc.setFontSize(14);
  doc.text('العقود', 105, 35, { align: 'center' });
  autoTable(doc, {
    startY: 40,
    head: [['رقم العقد', 'المستأجر', 'الإيجار الشهري', 'السنوي']],
    body: data.contracts.map(c => [
      c.contract_number,
      c.tenant_name,
      `${Number(c.rent_amount).toLocaleString()}`,
      `${(Number(c.rent_amount) * 12).toLocaleString()}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  let y = (doc as any).lastAutoTable?.finalY + 10 || 100;

  // Income
  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(14);
  doc.text('الإيرادات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 5,
    head: [['المصدر', 'المبلغ']],
    body: Object.entries(data.incomeBySource).map(([s, a]) => [s, `+${a.toLocaleString()}`]),
    foot: [['الإجمالي', `+${data.totalIncome.toLocaleString()}`]],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 150;

  // Expenses
  doc.setFont(fontFamily, 'bold');
  doc.text('المصروفات', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 5,
    head: [['النوع', 'المبلغ']],
    body: Object.entries(data.expensesByType).map(([t, a]) => [t, `-${a.toLocaleString()}`]),
    foot: [['الإجمالي', `-${data.totalExpenses.toLocaleString()}`]],
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], font: fontFamily, fontStyle: 'bold' },
    footStyles: { fillColor: [220, 38, 38], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 200;

  // Distribution
  doc.setFont(fontFamily, 'bold');
  doc.text('التوزيع', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 5,
    head: [['البند', 'المبلغ']],
    body: [
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', data.adminShare.toLocaleString()],
      ['حصة الواقف (5%)', data.waqifShare.toLocaleString()],
      ['ريع الوقف', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  y = (doc as any).lastAutoTable?.finalY + 10 || 250;

  // Beneficiaries
  doc.setFont(fontFamily, 'bold');
  doc.text('حصص المستفيدين', 105, y, { align: 'center' });
  autoTable(doc, {
    startY: y + 5,
    head: [['المستفيد', 'النسبة', 'المبلغ']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${Number(b.share_percentage).toFixed(2)}%`,
      (data.waqfRevenue * Number(b.share_percentage) / 100).toLocaleString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });

  addFooter(doc, fontFamily);
  doc.save('accounts-report.pdf');
};
