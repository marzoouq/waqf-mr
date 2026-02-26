import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Layers, TrendingUp, CircleDollarSign, Receipt, Wallet } from 'lucide-react';

interface PropertySummary {
  totalProperties: number;
  totalUnitsCount: number;
  totalRented: number;
  totalVacant: number;
  overallOccupancy: number;
  contractualRevenue: number;
  activeIncome: number;
  totalExpensesAll: number;
  netIncome: number;
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[5, 6, 7, 8].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-14" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">الإيرادات التعاقدية</p><p className="text-lg font-bold">{summary.contractualRevenue.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CircleDollarSign className="w-5 h-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">الدخل النشط</p><p className="text-lg font-bold text-success">{summary.activeIncome.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><Receipt className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">المصروفات</p><p className="text-lg font-bold">{summary.totalExpensesAll.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Wallet className="w-5 h-5 text-foreground" /></div>
            <div><p className="text-xs text-muted-foreground">صافي الدخل</p><p className={`text-lg font-bold ${summary.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{summary.netIncome.toLocaleString('ar-SA')} <span className="text-xs font-normal">ريال</span></p></div>
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
    </div>
  );
};

export default PropertySummaryCards;
