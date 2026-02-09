import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

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

export const generateAnnualReportPDF = (data: ReportData) => {
  const doc = new jsPDF();
  
  // Add Arabic font support info
  doc.setFont('helvetica', 'bold');
  
  // Title
  doc.setFontSize(20);
  doc.text('تقرير الوقف السنوي / Annual Waqf Report', 105, 20, { align: 'center' });
  
  // Fiscal Year
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`السنة المالية / Fiscal Year: ${data.fiscalYear}`, 105, 35, { align: 'center' });
  
  // Summary Table
  doc.autoTable({
    startY: 45,
    head: [['البند / Item', 'المبلغ (ر.س) / Amount (SAR)']],
    body: [
      ['إجمالي الإيرادات / Total Income', data.totalIncome.toLocaleString()],
      ['إجمالي المصروفات / Total Expenses', `(${data.totalExpenses.toLocaleString()})`],
      ['صافي الريع / Net Revenue', data.netRevenue.toLocaleString()],
      ['حصة الناظر (10%) / Admin Share', data.adminShare.toLocaleString()],
      ['حصة الواقف (5%) / Waqif Share', data.waqifShare.toLocaleString()],
      ['ريع المستفيدين / Beneficiaries Revenue', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52] },
    styles: { halign: 'right' },
  });
  
  // Beneficiaries Distribution
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('توزيع حصص المستفيدين / Beneficiaries Distribution', 105, finalY + 20, { align: 'center' });
  
  doc.autoTable({
    startY: finalY + 30,
    head: [['اسم المستفيد / Beneficiary Name', 'النسبة % / Share %', 'المبلغ (ر.س) / Amount (SAR)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${b.percentage}%`,
      b.amount.toLocaleString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4] },
    styles: { halign: 'right' },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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

export const generateBeneficiaryStatementPDF = (beneficiaryName: string, sharePercentage: number, shareAmount: number, fiscalYear: string) => {
  const doc = new jsPDF();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('كشف حساب المستفيد / Beneficiary Statement', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`السنة المالية / Fiscal Year: ${fiscalYear}`, 105, 35, { align: 'center' });
  
  doc.autoTable({
    startY: 50,
    head: [['البيان / Details', 'القيمة / Value']],
    body: [
      ['اسم المستفيد / Beneficiary Name', beneficiaryName],
      ['نسبة الحصة / Share Percentage', `${sharePercentage}%`],
      ['مبلغ الحصة / Share Amount', `${shareAmount.toLocaleString()} ر.س / SAR`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52] },
    styles: { halign: 'right' },
  });
  
  doc.setFontSize(10);
  doc.text(
    `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};
