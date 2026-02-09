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

interface ReportData {
  fiscalYear: string;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
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
      ['إجمالي الإيرادات', data.totalIncome.toLocaleString()],
      ['إجمالي المصروفات', `(${data.totalExpenses.toLocaleString()})`],
      ['صافي الريع', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%)', data.adminShare.toLocaleString()],
      ['حصة الواقف (5%)', data.waqifShare.toLocaleString()],
      ['ريع المستفيدين', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52], font: fontFamily, fontStyle: 'bold' },
    styles: { halign: 'right', font: fontFamily, fontStyle: 'normal' },
  });
  
  // Beneficiaries Distribution
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
  
  // Footer
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
  
  // Save
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
  
  doc.setFontSize(10);
  doc.setFont(fontFamily, 'normal');
  doc.text(
    `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};
