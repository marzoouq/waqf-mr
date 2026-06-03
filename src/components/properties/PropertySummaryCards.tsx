import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import { Building2, Layers, ArrowLeft, Wallet, AlertTriangle } from 'lucide-react';
import { fmt } from '@/utils/format/format';

interface PropertySummary {
  totalProperties: number;
  totalUnitsCount: number;
  totalRented: number;
  totalVacant: number;
  overallOccupancy: number;
  /** حصة السنة المالية من قيمة العقود (allocated_amount أو rent_amount) */
  contractualRevenue: number;
  /** الإيرادات المتوقعة من العقود النشطة فقط */
  activeIncome: number;
  /** الإيراد المحصّل فعلياً من فواتير الدفع المسددة في السنة */
  collectedIncome: number;
  totalExpensesAll: number;
  /** صافي بعد المصروفات = المحصّل − المصروفات */
  netIncome: number;
  isClosed?: boolean;
}

interface PropertySummaryCardsProps {
  summary: PropertySummary;
  isLoading: boolean;
}

const PropertySummaryCards = ({ summary, isLoading }: PropertySummaryCardsProps) => {
  const occColor = summary.overallOccupancy >= 80 ? 'text-success' : summary.overallOccupancy >= 50 ? 'text-warning' : 'text-destructive';
  const occBarColor = summary.overallOccupancy >= 80 ? '[&>div]:bg-success' : summary.overallOccupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';

  if (isLoading) {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-14" />
      </div>
    );
  }

  // متوسط الإيجار = حصة السنة من قيمة العقود ÷ عدد الوحدات المؤجرة (مرحَّل من لوحة الناظر)
  const avgRent = summary.totalRented > 0 && summary.contractualRevenue > 0
    ? Math.round(summary.contractualRevenue / summary.totalRented)
    : 0;

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي العقارات</p><p className="text-xl font-bold">{summary.totalProperties}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50"><Layers className="w-5 h-5 text-accent-foreground" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الوحدات</p><p className="text-xl font-bold">{summary.totalUnitsCount}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><div className="w-5 h-5 rounded-full bg-success" /></div>
            <div><p className="text-xs text-muted-foreground">مؤجرة</p><p className="text-xl font-bold text-success">{summary.totalRented}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><div className="w-5 h-5 rounded-full bg-warning" /></div>
            <div><p className="text-xs text-muted-foreground">شاغرة</p><p className="text-xl font-bold text-warning">{summary.totalVacant}</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">متوسط الإيجار</p>
              <p className="text-base sm:text-xl font-bold tabular-nums truncate text-primary">{fmt(avgRent)} <span className="text-xs font-normal">ر.س</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">نسبة الإشغال الإجمالية</span>
            <span className={`text-sm font-bold ${occColor}`}>{summary.overallOccupancy}%</span>
          </div>
          <Progress value={summary.overallOccupancy} className={`h-3 ${occBarColor}`} />
        </CardContent>
      </Card>

      <Card className="shadow-sm bg-muted/30">
        <CardContent className="p-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <span className="text-muted-foreground">
            للاطلاع على الإيرادات والمصروفات وصافي الدخل، انتقل إلى صفحات الاختصاص.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/dashboard/reports" className="inline-flex items-center gap-1 text-primary hover:underline">
              التقارير المالية <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <Link to="/dashboard/invoices" className="inline-flex items-center gap-1 text-primary hover:underline">
              الفواتير <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertySummaryCards;
