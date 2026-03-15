/**
 * A-1: قائمة تحقق (Checklist) قبل إقفال السنة المالية.
 * تتحقق من اكتمال العمليات الأساسية قبل السماح بالإقفال.
 */
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  label: string;
  passed: boolean;
  severity: 'error' | 'warning';
  detail?: string;
}

interface CloseYearChecklistProps {
  items: ChecklistItem[];
  className?: string;
}

const CloseYearChecklist: React.FC<CloseYearChecklistProps> = ({ items, className }) => {
  const hasErrors = items.some(i => !i.passed && i.severity === 'error');

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm font-medium text-muted-foreground mb-1">فحص ما قبل الإقفال:</p>
      <ul className="space-y-1.5">
        {items.map((item, idx) => {
          const Icon = item.passed ? CheckCircle : item.severity === 'error' ? XCircle : AlertTriangle;
          const color = item.passed
            ? 'text-success'
            : item.severity === 'error'
              ? 'text-destructive'
              : 'text-warning';

          return (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', color)} />
              <div>
                <span className={item.passed ? 'text-muted-foreground' : 'text-foreground'}>{item.label}</span>
                {item.detail && !item.passed && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {hasErrors && (
        <p className="text-xs text-destructive font-medium mt-2">
          ⚠️ يوجد عناصر حرجة لم تكتمل — يُنصح بمعالجتها قبل الإقفال
        </p>
      )}
    </div>
  );
};

export default CloseYearChecklist;

/** 
 * بناء قائمة التحقق من بيانات الصفحة
 */
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

  // 1. وجود حساب ختامي
  items.push({
    label: 'تم إنشاء الحساب الختامي',
    passed: params.hasAccount,
    severity: 'error',
    detail: 'يجب إنشاء حساب ختامي قبل الإقفال',
  });

  // 2. وجود دخل مسجّل
  items.push({
    label: 'تم تسجيل الإيرادات',
    passed: params.totalIncome > 0,
    severity: 'warning',
    detail: 'لم يتم تسجيل أي دخل لهذه السنة',
  });

  // 3. نسب المستفيدين
  items.push({
    label: `إجمالي نسب المستفيدين: ${params.beneficiaryPercentage}%`,
    passed: params.beneficiaryPercentage > 0 && params.beneficiaryPercentage <= 100,
    severity: params.beneficiaryPercentage > 100 ? 'error' : 'warning',
    detail: params.beneficiaryPercentage > 100 
      ? 'إجمالي النسب يتجاوز 100%!' 
      : 'لم يتم تحديد نسب المستفيدين',
  });

  // 4. فواتير غير مسددة
  items.push({
    label: params.unpaidInvoices === 0 
      ? 'جميع الفواتير مسددة'
      : `${params.unpaidInvoices} فاتورة غير مسددة`,
    passed: params.unpaidInvoices === 0,
    severity: 'warning',
    detail: 'يوجد فواتير معلقة — سيتم أرشفتها بحالتها الحالية',
  });

  // 5. طلبات سُلف معلقة
  items.push({
    label: params.pendingAdvances === 0
      ? 'لا توجد سُلف معلقة'
      : `${params.pendingAdvances} طلب سلفة معلق`,
    passed: params.pendingAdvances === 0,
    severity: 'warning',
    detail: 'يُنصح بمعالجة السُلف المعلقة قبل الإقفال',
  });

  // 6. التوزيعات
  items.push({
    label: params.distributionsAmount > 0
      ? `تم توزيع ${params.distributionsAmount.toLocaleString()} ر.س`
      : 'لم يتم إجراء توزيعات',
    passed: params.distributionsAmount > 0 || params.availableAmount <= 0,
    severity: 'warning',
    detail: 'يوجد مبلغ متاح لم يُوزَّع بعد',
  });

  return items;
}
