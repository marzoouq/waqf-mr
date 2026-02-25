/**
 * لوحة تحكم مخصصة للواقف
 * تعرض ملخص شامل للوقف: العقارات، العقود، الأداء المالي
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useProperties } from '@/hooks/useProperties';
import { useContracts } from '@/hooks/useContracts';
import { useBeneficiariesSafe } from '@/hooks/useBeneficiaries';
import DashboardLayout from '@/components/DashboardLayout';
import { DashboardSkeleton } from '@/components/SkeletonLoaders';
import NoPublishedYearsNotice from '@/components/NoPublishedYearsNotice';
import ExportMenu from '@/components/ExportMenu';
import {
  Building2, FileText, Users, TrendingUp, Wallet, BarChart3, BookOpen,
  Sun, Moon, Calendar, Clock, ArrowLeft, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WaqifDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fiscalYear, fiscalYearId, isLoading: fyLoading, noPublishedYears } = useFiscalYear();
  const { availableAmount, totalIncome, totalExpenses, isLoading: finLoading } = useFinancialSummary(fiscalYearId, fiscalYear?.label);
  const { data: properties = [], isLoading: propLoading } = useProperties();
  const { data: contracts = [], isLoading: contLoading } = useContracts();
  const { data: beneficiaries = [], isLoading: benLoading } = useBeneficiariesSafe();

  const isLoading = fyLoading || finLoading || propLoading || contLoading || benLoading;

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiredContracts = contracts.filter(c => c.status === 'expired');

  /* ── Live clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';
  const GreetingIcon = hour < 12 ? Sun : Moon;
  const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const gregorianDate = now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const quickLinks = [
    { title: 'العقارات', description: 'استعراض جميع عقارات الوقف', icon: Building2, path: '/beneficiary/properties', color: 'bg-primary/10 text-primary' },
    { title: 'العقود', description: 'عقود الإيجار النشطة والمنتهية', icon: FileText, path: '/beneficiary/contracts', color: 'bg-accent/10 text-accent-foreground' },
    { title: 'التقارير المالية', description: 'الرسوم البيانية والإحصائيات', icon: BarChart3, path: '/beneficiary/financial-reports', color: 'bg-muted text-muted-foreground' },
    { title: 'الحسابات الختامية', description: 'البيانات المالية التفصيلية', icon: Wallet, path: '/beneficiary/accounts', color: 'bg-secondary/10 text-secondary' },
    { title: 'اللائحة التنظيمية', description: 'أحكام ولوائح الوقف', icon: BookOpen, path: '/beneficiary/bylaws', color: 'bg-primary/10 text-primary' },
  ];

  if (isLoading) {
    return <DashboardLayout><DashboardSkeleton /></DashboardLayout>;
  }

  if (noPublishedYears) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-6 space-y-4">
          <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                  <GreetingIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/80">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl font-bold font-display">الواقف</h1>
                </div>
              </div>
            </CardContent>
          </Card>
          <NoPublishedYearsNotice />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* ═══ Welcome Card ═══ */}
        <Card className="overflow-hidden border-0 shadow-lg gradient-primary text-primary-foreground animate-slide-up">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                  <GreetingIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-base text-primary-foreground/80">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">الواقف</h1>
                  <p className="text-xs sm:text-sm text-primary-foreground/70 mt-0.5">لوحة متابعة الوقف</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-primary-foreground/85 shrink-0">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{hijriDate}</span>
                <span className="hidden sm:inline text-primary-foreground/40">|</span>
                <span>{gregorianDate}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{timeStr}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <ExportMenu hidePdf />
        </div>

        {/* ═══ Overview Stats ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">العقارات</p>
                  <p className="text-lg sm:text-xl font-bold">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">العقود النشطة</p>
                  <p className="text-lg sm:text-xl font-bold">{activeContracts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-secondary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">المستفيدون</p>
                  <p className="text-lg sm:text-xl font-bold">{beneficiaries.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">ريع الوقف</p>
                  <p className="text-lg sm:text-xl font-bold truncate">{Number(availableAmount || 0).toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Financial Summary ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="w-5 h-5" />
                الملخص المالي
                <Badge variant="outline" className="text-[10px]">{fiscalYear?.label || '—'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">إجمالي الدخل</span>
                <span className="font-bold text-primary">{Number(totalIncome || 0).toLocaleString()} ر.س</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">إجمالي المصروفات</span>
                <span className="font-bold text-destructive">{Number(totalExpenses || 0).toLocaleString()} ر.س</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium">صافي الريع المتاح</span>
                <span className="font-bold text-lg">{Number(availableAmount || 0).toLocaleString()} ر.س</span>
              </div>
            </CardContent>
          </Card>

          {/* Contracts Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="w-5 h-5" />
                حالة العقود
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm">نشطة</span>
                </div>
                <Badge variant="default">{activeContracts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm">منتهية</span>
                </div>
                <Badge variant="secondary">{expiredContracts.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">إجمالي قيمة العقود النشطة</span>
                <span className="font-bold">{activeContracts.reduce((s, c) => s + Number(c.rent_amount), 0).toLocaleString()} ر.س</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══ Quick Links ═══ */}
        <div>
          <h2 className="text-base sm:text-lg font-bold mb-3">الوصول السريع</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <Card key={link.path} className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(link.path)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{link.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{link.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WaqifDashboard;
