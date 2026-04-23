/**
 * بطاقة KPI + الملخص المالي + حالة العقود في لوحة الواقف
 */
import { fmt } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, Wallet, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface KpiItem {
  label: string;
  value: number | string;
  suffix: string;
  color: string;
  progressColor: string;
}

interface CollectionSummary {
  onTime: number;
  late: number;
  total: number;
}

interface WaqifFinancialSectionProps {
  kpis: KpiItem[];
  fiscalYearLabel: string;
  totalIncome: number;
  totalExpenses: number;
  availableAmount: number;
  isFiscalYearActive: boolean;
  activeContractsCount: number;
  expiredContractsCount: number;
  contractualRevenue: number;
  collectionSummary: CollectionSummary;
}

const WaqifFinancialSection = ({
  kpis, fiscalYearLabel, totalIncome, totalExpenses, availableAmount, isFiscalYearActive,
  activeContractsCount, expiredContractsCount, contractualRevenue, collectionSummary,
}: WaqifFinancialSectionProps) => (
  <>
    {/* ═══ KPI Panel ═══ */}
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Gauge className="w-5 h-5" />
          مؤشرات الأداء الرئيسية
          <Badge variant="outline" className="text-[11px]">{fiscalYearLabel || '—'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="text-center space-y-1 sm:space-y-2 p-3 sm:p-4 rounded-lg bg-muted/30">
              <p className="text-xs sm:text-sm text-muted-foreground">{kpi.label}</p>
              <p className={`text-xl sm:text-3xl font-bold tabular-nums ${kpi.color}`}>{typeof kpi.value === 'number' ? fmt(kpi.value) : kpi.value}{kpi.suffix}</p>
              {kpi.progressColor && <Progress value={Math.min(typeof kpi.value === 'number' ? kpi.value : 0, 100)} className={`h-2 ${kpi.progressColor}`} />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* ═══ Financial Summary + Contracts Status ═══ */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="w-5 h-5" /> التسلسل المالي
            <Badge variant="outline" className="text-[11px]">{fiscalYearLabel || '—'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'إجمالي الدخل', value: totalIncome, cls: 'text-primary' },
            { label: 'إجمالي المصروفات', value: totalExpenses, cls: 'text-destructive' },
            { label: 'الريع القابل للتوزيع', value: availableAmount, cls: 'font-bold text-lg' },
          ].map((row, i) => (
            <div key={row.label} className={`flex items-center justify-between p-3 rounded-lg ${i === 2 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}>
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className={`font-bold ${row.cls}`}>
                {i === 2 && isFiscalYearActive ? 'تُحسب عند الإقفال' : `${fmt(safeNumber(row.value))} ر.س`}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-5 h-5" /> حالة العقود والتحصيل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /><span className="text-sm">نشطة</span></div>
            <Badge variant="default">{activeContractsCount}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /><span className="text-sm">منتهية</span></div>
            <Badge variant="secondary">{expiredContractsCount}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">إجمالي قيمة العقود النشطة</span>
            <span className="font-bold">{fmt(contractualRevenue)} ر.س</span>
          </div>
          {collectionSummary.total > 0 && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <span className="text-sm">تحصيل منتظم</span>
                <span className="font-bold text-success">{collectionSummary.onTime} فاتورة</span>
              </div>
              {collectionSummary.late > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <span className="text-sm">تحصيل متأخر</span>
                  <span className="font-bold text-destructive">{collectionSummary.late} فاتورة</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  </>
);

export default WaqifFinancialSection;
