/**
 * طباعة تقرير التوزيع الشامل مباشرة من المتصفح بتنسيق رسمي
 * ملاحظة: لا يستورد toast — يُرجع false عند فشل فتح النافذة والطبقة المستدعية تتولى الإشعار
 * قالب HTML/CSS مستخرج في `printDistributionTemplate.ts`.
 */
import { PRINT_WINDOW_RENDER_DELAY_MS } from '@/constants/timing';
import {
  buildDistributionHtml,
  type DistributionRow,
} from './printDistributionTemplate';

interface PrintDistributionParams {
  fiscalYearLabel: string;
  availableAmount: number;
  distributions: DistributionRow[];
  waqfName?: string;
  deedNumber?: string;
  logoUrl?: string;
}

/**
 * @returns true عند النجاح، false إذا تعذر فتح النافذة
 */
export function printDistributionReport(params: PrintDistributionParams): boolean {
  const { fiscalYearLabel, availableAmount, distributions, waqfName, deedNumber, logoUrl } = params;

  const totalNet = distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalAdvances = distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalDeficit = distributions.reduce((s, d) => s + d.deficit, 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  const html = buildDistributionHtml({
    fiscalYearLabel,
    availableAmount,
    distributions,
    totalNet,
    totalAdvances,
    totalCarryforward,
    totalDeficit,
    waqfName,
    deedNumber,
    logoUrl,
  });

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), PRINT_WINDOW_RENDER_DELAY_MS);
  // إغلاق النافذة تلقائياً بعد الطباعة أو الإلغاء
  printWindow.onafterprint = () => printWindow.close();
  return true;
}
