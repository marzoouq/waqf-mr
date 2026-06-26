/**
 * بطاقة KPI + حالة العقود + ملخص التحصيل في لوحة الواقف
 *
 * ملاحظة Wave F: تم حذف كتلة "التسلسل المالي" (إجمالي الدخل/المصروفات/الريع القابل للتوزيع)
 * لأنها مكررة مع التقارير المالية + AnnualDisclosureTable. تُعرض الآن كرابط إرشادي للتقارير.
 * Wave 3: AnimatedCounter لأرقام KPI.
 */
import { fmt } from '@/utils/format/format';
import { Link } from 'react-router-dom';
import { AnimatedCounter } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gauge, FileText, CheckCircle, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { COLLECTION_SUMMARY_RULE_AR } from '@/constants/collectionRules';

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
  activeContractsCount: number;
  expiredContractsCount: number;
  contractualRevenue: number;
  collectionSummary: CollectionSummary;
}

const WaqifFinancialSection = ({
  kpis, fiscalYearLabel,
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

    {/* ═══ Contracts Status — التسلسل المالي مُرحَّل للتقارير ═══ */}
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><FileText className="w-5 h-5" /> حالة العقود والتحصيل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /><span className="text-sm">نشطة</span></div>
            <Badge variant="default">{activeContractsCount}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /><span className="text-sm">منتهية</span></div>
            <Badge variant="secondary">{expiredContractsCount}</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">قيمة العقود</span>
            <span className="font-bold tabular-nums">{fmt(contractualRevenue)} ر.س</span>
          </div>
        </div>

        {collectionSummary.total > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                <span className="text-sm">مسددة (كاملاً أو جزئياً)</span>
                <span className="font-bold text-success">{collectionSummary.onTime} فاتورة</span>
              </div>
              {collectionSummary.late > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <span className="text-sm">متأخرة</span>
                  <span className="font-bold text-destructive">{collectionSummary.late} فاتورة</span>
                </div>
              )}
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{COLLECTION_SUMMARY_RULE_AR}</span>
            </p>
          </>
        )}

        <Link
          to="/beneficiary/financial-reports"
          className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
        >
          <span className="text-sm text-muted-foreground">
            للاطلاع على التسلسل المالي الكامل (الدخل، المصروفات، الريع القابل للتوزيع)
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary shrink-0">
            التقارير المالية <ArrowLeft className="w-3.5 h-3.5" />
          </span>
        </Link>
      </CardContent>
    </Card>
  </>
);

export default WaqifFinancialSection;
