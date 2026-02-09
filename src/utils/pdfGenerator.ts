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
  doc.text('Annual Waqf Report / Ifsa Al-Sanawi', 105, 20, { align: 'center' });
  
  // Fiscal Year
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fiscal Year: ${data.fiscalYear}`, 105, 35, { align: 'center' });
  
  // Summary Table
  doc.autoTable({
    startY: 45,
    head: [['Item', 'Amount (SAR)']],
    body: [
      ['Total Income', data.totalIncome.toLocaleString()],
      ['Total Expenses', `(${data.totalExpenses.toLocaleString()})`],
      ['Net Revenue', data.netRevenue.toLocaleString()],
      ['Admin Share (10%)', data.adminShare.toLocaleString()],
      ['Waqif Share (5%)', data.waqifShare.toLocaleString()],
      ['Waqf Revenue for Beneficiaries', data.waqfRevenue.toLocaleString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [22, 101, 52] },
  });
  
  // Beneficiaries Distribution
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 100;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Beneficiaries Distribution', 20, finalY + 20);
  
  doc.autoTable({
    startY: finalY + 30,
    head: [['Beneficiary Name', 'Share %', 'Amount (SAR)']],
    body: data.beneficiaries.map(b => [
      b.name,
      `${b.percentage}%`,
      b.amount.toLocaleString(),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [202, 138, 4] },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} - Generated on ${new Date().toLocaleDateString()}`,
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
  doc.text('Beneficiary Statement', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fiscal Year: ${fiscalYear}`, 105, 35, { align: 'center' });
  
  doc.autoTable({
    startY: 50,
    head: [['Details', 'Value']],
    body: [
      ['Beneficiary Name', beneficiaryName],
      ['Share Percentage', `${sharePercentage}%`],
      ['Share Amount', `${shareAmount.toLocaleString()} SAR`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 101, 52] },
  });
  
  doc.setFontSize(10);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()}`,
    105,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );
  
  doc.save(`statement-${beneficiaryName}-${fiscalYear}.pdf`);
};
