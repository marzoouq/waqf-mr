import { toast } from 'sonner';

interface PrintShareReportParams {
  beneficiaryName: string;
  beneficiariesShare: number;
  myShare: number;
  paidAdvancesTotal: number;
  carryforwardBalance: number;
  fiscalYearLabel: string | undefined;
  filteredDistributions: Array<{
    date: string;
    amount: number;
    status: string;
    account?: { fiscal_year?: string } | null;
  }>;
}

export function printShareReport(params: PrintShareReportParams) {
  const {
    beneficiaryName,
    beneficiariesShare,
    myShare,
    paidAdvancesTotal: advances,
    carryforwardBalance: carryforward,
    fiscalYearLabel,
    filteredDistributions,
  } = params;

  const rawNet = myShare - advances - carryforward;
  const net = Math.max(0, rawNet);
  const deficit = rawNet < 0 ? Math.abs(rawNet) : 0;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('يرجى السماح بالنوافذ المنبثقة');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
    <title>تقرير التوزيع - ${beneficiaryName}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Amiri', serif; padding: 40px; color: #1a1a1a; direction: rtl; }
      h1 { text-align: center; font-size: 22px; margin-bottom: 6px; }
      .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 10px 14px; text-align: right; font-size: 14px; }
      th { background: #f3f4f6; font-weight: bold; }
      .total-row { background: #f9fafb; font-weight: bold; }
      .deficit { color: #dc2626; }
      .section-title { font-size: 16px; font-weight: bold; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #d1d5db; padding-bottom: 4px; }
      .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>تقرير توزيع الحصة</h1>
    <p class="subtitle">السنة المالية: ${fiscalYearLabel || '—'}</p>

    <p class="section-title">بيانات المستفيد</p>
    <table>
      <tr><th>الاسم</th><td>${beneficiaryName}</td></tr>
      <tr><th>نسبة الحصة</th><td>محجوبة</td></tr>
      <tr><th>إجمالي الريع المتاح للتوزيع</th><td>${beneficiariesShare.toLocaleString()} ر.س</td></tr>
    </table>

    <p class="section-title">تفاصيل التوزيع</p>
    <table>
      <tr><th>الحصة المستحقة</th><td>${myShare.toLocaleString()} ر.س</td></tr>
      <tr><th>السُلف المصروفة</th><td>${advances.toLocaleString()} ر.س</td></tr>
      <tr><th>فروق مرحّلة مخصومة</th><td>${carryforward.toLocaleString()} ر.س</td></tr>
      <tr class="total-row"><th>صافي المبلغ المستحق</th><td>${net.toLocaleString()} ر.س</td></tr>
      ${deficit > 0 ? `<tr class="deficit"><th>فرق مرحّل للسنة القادمة</th><td>${deficit.toLocaleString()} ر.س</td></tr>` : ''}
    </table>

    ${filteredDistributions.length > 0 ? `
      <p class="section-title">سجل التوزيعات</p>
      <table>
        <tr><th>التاريخ</th><th>السنة المالية</th><th>المبلغ</th><th>الحالة</th></tr>
        ${filteredDistributions.map(d => `<tr>
          <td>${new Date(d.date).toLocaleDateString('ar-SA')}</td>
          <td>${(d as any).account?.fiscal_year || '—'}</td>
          <td>${Number(d.amount).toLocaleString()} ر.س</td>
          <td>${d.status === 'paid' ? 'مستلم' : d.status === 'pending' ? 'معلق' : d.status}</td>
        </tr>`).join('')}
      </table>
    ` : ''}

    <p class="footer">تمت الطباعة بتاريخ ${new Date().toLocaleDateString('ar-SA')} — نظام إدارة الوقف</p>
  </body></html>`);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}
