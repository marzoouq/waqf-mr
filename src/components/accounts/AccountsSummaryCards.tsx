import { RevenueWaterfall } from '@/components/common';
import type { WaterfallRow } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AccountsSummaryCardsProps {
  waqfCorpusPrevious: number;
  totalIncome: number;
  grandTotal: number;
  totalExpenses: number;
  netAfterExpenses: number;
  manualVat: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat?: number;
  adminPercent: number;
  adminShare: number;
  waqifPercent: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusManual: number;
  manualDistributions: number;
  remainingBalance: number;
  /** Whether the fiscal year is closed — if false and forcePreview, shows estimate notice */
  isClosed?: boolean;
  /** H11: whether default percentages are being used instead of configured ones */
  usingFallbackPct?: boolean;
  /** P0-2: قيم DB الأصلية لكشف overrides غير المحفوظة */
  defaultManualVat?: number;
  defaultZakatAmount?: number;
  defaultWaqfCorpusManual?: number;
  defaultManualDistributions?: number;
}

const isOverridden = (current: number, original: number | undefined) =>
  original !== undefined && Math.abs(current - original) > 0.01;

const AccountsSummaryCards = ({
  waqfCorpusPrevious, totalIncome, grandTotal, totalExpenses,
  netAfterExpenses, manualVat, netAfterVat, zakatAmount, netAfterZakat,
  adminPercent, adminShare, waqifPercent, waqifShare,
  waqfRevenue, waqfCorpusManual, manualDistributions, remainingBalance,
  isClosed = false, usingFallbackPct = false,
  defaultManualVat, defaultZakatAmount, defaultWaqfCorpusManual, defaultManualDistributions,
}: AccountsSummaryCardsProps) => {
  const computedNetAfterZakat = netAfterZakat ?? (netAfterVat - zakatAmount);
  const vatOverridden = isOverridden(manualVat, defaultManualVat);
  const zakatOverridden = isOverridden(zakatAmount, defaultZakatAmount);
  const corpusOverridden = isOverridden(waqfCorpusManual, defaultWaqfCorpusManual);
  const distOverridden = isOverridden(manualDistributions, defaultManualDistributions);
  const anyOverridden = vatOverridden || zakatOverridden || corpusOverridden || distOverridden;
  const est = isClosed ? undefined : ('estimated' as const);
  const unsaved = (flag: boolean) => (flag ? ('unsaved' as const) : undefined);
  const hasCarry = waqfCorpusPrevious > 0;

  // نفس البنود والقيم السابقة بالترتيب المحاسبي — تُعرض كما هي دون حساب جديد
  const rows: WaterfallRow[] = [
    { kind: 'plus', label: 'إجمالي الدخل', value: totalIncome },
    ...(hasCarry ? [
      { kind: 'plus', label: 'رقبة وقف مرحلة', value: waqfCorpusPrevious },
      { kind: 'subtotal', label: 'الإجمالي الشامل', value: grandTotal },
    ] satisfies WaterfallRow[] : []),
    { kind: 'minus', label: 'المصروفات التشغيلية', value: totalExpenses },
    { kind: 'subtotal', label: 'الصافي بعد المصاريف', value: netAfterExpenses },
    { kind: 'vat', label: 'ضريبة القيمة المضافة', value: manualVat, flag: unsaved(vatOverridden) },
    { kind: 'subtotal', label: 'الصافي بعد الضريبة', value: netAfterVat },
    { kind: 'minus', label: 'الزكاة', value: zakatAmount, flag: unsaved(zakatOverridden) },
    { kind: 'subtotal', label: 'الصافي بعد الزكاة', value: computedNetAfterZakat },
    { kind: 'share', label: `حصة الناظر (${adminPercent}%)`, value: adminShare, flag: est },
    { kind: 'share', label: `حصة الواقف (${waqifPercent}%)`, value: waqifShare, flag: est },
    { kind: 'total', label: 'ريع الوقف', value: waqfRevenue, flag: est },
    { kind: 'minus', label: 'رقبة الوقف (الحالي)', value: waqfCorpusManual, flag: unsaved(corpusOverridden) },
    { kind: 'minus', label: 'التوزيعات', value: manualDistributions, flag: unsaved(distOverridden) },
    { kind: 'total', label: 'الرصيد المتبقي', value: remainingBalance },
  ];

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-xl text-primary dark:text-foreground">
          <Calculator className="w-5 h-5 text-bronze" aria-hidden="true" />
          ملخص الحسابات الحالية
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="px-4 sm:px-6 space-y-3 empty:hidden">
          {!isClosed && (
            <Alert className="border-vat/30 bg-vat-muted">
              <AlertTriangle className="h-4 w-4 text-vat" />
              <AlertDescription>هذه أرقام تقديرية — يتم اعتمادها رسمياً عند إقفال السنة المالية</AlertDescription>
            </Alert>
          )}
          {usingFallbackPct && (
            <Alert className="border-vat/30 bg-vat-muted">
              <AlertTriangle className="h-4 w-4 text-vat" />
              <AlertDescription>تُستخدَم النسب الافتراضية (ناظر 10%، واقف 5%) — يمكنك تعديلها من إعدادات الحسابات</AlertDescription>
            </Alert>
          )}
          {anyOverridden && (
            <Alert className="border-destructive/40 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription>تم تعديل قيمة يدوية في الواجهة فقط — لم تُحفظ في قاعدة البيانات وستُفقد عند تحديث الصفحة.</AlertDescription>
            </Alert>
          )}
        </div>
        <RevenueWaterfall rows={rows} base={hasCarry ? grandTotal : totalIncome} className="mt-3 border-t" />
      </CardContent>
    </Card>
  );
};

export default AccountsSummaryCards;
