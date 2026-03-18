import { fmt } from '@/utils/format';
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
    label: 'تم إنشاء الحساب الختامي',
    passed: params.hasAccount,
    severity: 'error',
    detail: 'يجب إنشاء حساب ختامي قبل الإقفال',
  });

  items.push({
    label: 'تم تسجيل الإيرادات',
    passed: params.totalIncome > 0,
    severity: 'warning',
    detail: 'لم يتم تسجيل أي دخل لهذه السنة',
  });

  items.push({
    label: `إجمالي نسب المستفيدين: ${params.beneficiaryPercentage}%`,
    passed: params.beneficiaryPercentage > 0 && params.beneficiaryPercentage <= 100,
    severity: params.beneficiaryPercentage > 100 ? 'error' : 'warning',
    detail: params.beneficiaryPercentage > 100 ? 'إجمالي النسب يتجاوز 100%!' : 'لم يتم تحديد نسب المستفيدين',
  });

  items.push({
    label: params.unpaidInvoices === 0 ? 'جميع الفواتير مسددة' : `${params.unpaidInvoices} فاتورة غير مسددة`,
    passed: params.unpaidInvoices === 0,
    severity: 'warning',
    detail: 'يوجد فواتير معلقة — سيتم أرشفتها بحالتها الحالية',
  });

  items.push({
    label: params.pendingAdvances === 0 ? 'لا توجد سُلف معلقة' : `${params.pendingAdvances} طلب سلفة معلق`,
    passed: params.pendingAdvances === 0,
    severity: 'warning',
    detail: 'يُنصح بمعالجة السُلف المعلقة قبل الإقفال',
  });

  items.push({
    label: params.distributionsAmount > 0 ? `تم توزيع ${params.distributionsAmount.toLocaleString()} ر.س` : 'لم يتم إجراء توزيعات',
    passed: params.distributionsAmount > 0 || params.availableAmount <= 0,
    severity: 'warning',
    detail: 'يوجد مبلغ متاح لم يُوزَّع بعد',
  });

  return items;
}