import { fmt } from '@/utils/format/format';
import { isPercentageTotalOff } from '@/utils/financial/distribution/distributionBase';
export interface ChecklistItem {
  label: string;
  passed: boolean;
  severity: 'error' | 'warning';
  detail?: string;
}

export function buildClosureChecklist(params: {
  totalIncome: number;
  totalExpenses: number;
  hasAccount: boolean;
  distributionsAmount: number;
  availableAmount: number;
  pendingAdvances: number;
  unpaidInvoices: number;
  beneficiaryPercentage: number;
}): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  items.push({
    label: params.hasAccount ? 'تم إنشاء الحساب الختامي' : 'لم يُنشأ الحساب الختامي بعد',
    passed: params.hasAccount,
    severity: 'error',
    detail: 'يجب إنشاء حساب ختامي قبل الإقفال',
  });

  // #17: إقفال بحسابات صفرية يُعد خطأً حرجاً — لا تحذيراً
  items.push({
    label: 'تم تسجيل الإيرادات',
    passed: params.totalIncome > 0,
    severity: 'error',
    detail: 'لا يمكن إقفال السنة بدون تسجيل إيرادات. احفظ الحسابات الختامية أولاً.',
  });

  items.push({
    label: `إجمالي نسب المستفيدين: ${params.beneficiaryPercentage}%`,
    passed: params.beneficiaryPercentage > 0 && !(params.beneficiaryPercentage > 100 && isPercentageTotalOff(params.beneficiaryPercentage)),
    severity: params.beneficiaryPercentage > 100 ? 'error' : 'warning',
    detail: params.beneficiaryPercentage > 100 ? 'إجمالي النسب يتجاوز 100%!' : 'لم يتم تحديد نسب المستفيدين',
  });

  items.push({
    label: params.unpaidInvoices === 0 ? 'جميع الفواتير مسددة' : `${params.unpaidInvoices} فاتورة غير مسددة`,
    passed: params.unpaidInvoices === 0,
    severity: 'warning',
    detail: 'سيتم ترحيل الفواتير غير المسددة إلى السنة التالية — المتأخرة منها بإشعار "متأخرة من السنة السابقة" وتُحسب في السنة الجديدة عند التحصيل، ولا تؤثر على أرقام السنة المقفلة',
  });

  items.push({
    label: params.pendingAdvances === 0 ? 'لا توجد سُلف معلقة' : `${params.pendingAdvances} طلب سلفة معلق`,
    passed: params.pendingAdvances === 0,
    severity: 'warning',
    detail: 'يُنصح بمعالجة السُلف المعلقة قبل الإقفال',
  });

  // التوزيع الجزئي لا يُعتبر "تم التوزيع". نسمح بفرق هللات صغير (≤0.01).
  const fullyDistributed = params.availableAmount <= 0
    || params.distributionsAmount + 0.01 >= params.availableAmount;
  items.push({
    label: params.distributionsAmount > 0
      ? `تم توزيع ${fmt(params.distributionsAmount)} ر.س${!fullyDistributed ? ` (المتاح ${fmt(params.availableAmount)} ر.س)` : ''}`
      : 'لم يتم إجراء توزيعات',
    passed: fullyDistributed,
    severity: 'warning',
    detail: 'يوجد مبلغ متاح لم يُوزَّع بالكامل',
  });

  return items;
}

