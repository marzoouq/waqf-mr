import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useNotifications } from '@/hooks/useNotifications';
import { useActiveFiscalYear } from '@/hooks/useFiscalYears';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { Wallet, FileText, BarChart3, PieChart, Calculator, Bell, ArrowLeft } from 'lucide-react';
import ExportMenu from '@/components/ExportMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/DashboardLayout';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useNavigate } from 'react-router-dom';

const BeneficiaryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: notifications = [] } = useNotifications();
  const { data: activeFY, fiscalYears } = useActiveFiscalYear();
  const [selectedFYId, setSelectedFYId] = useState<string>('');
  const fiscalYearId = selectedFYId || activeFY?.id || 'all';
  const selectedFY = fiscalYears.find(fy => fy.id === fiscalYearId);

  const { availableAmount } = useFinancialSummary(fiscalYearId, selectedFY?.label);

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);
  const beneficiariesShare = availableAmount;

  const myShare = currentBeneficiary 
    ? (beneficiariesShare * currentBeneficiary.share_percentage) / 100 
    : 0;

  const recentNotifications = notifications.slice(0, 3);

  const quickLinks = [
    {
      title: 'الإفصاح السنوي',
      description: 'البيان المالي التفصيلي الكامل',
      icon: FileText,
      path: '/beneficiary/disclosure',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'حصتي من الريع',
      description: 'تفاصيل حصتك وسجل التوزيعات',
      icon: PieChart,
      path: '/beneficiary/share',
      color: 'bg-success/10 text-success',
    },
    {
      title: 'الحسابات الختامية',
      description: 'العقود والإيرادات والمصروفات',
      icon: Calculator,
      path: '/beneficiary/accounts',
      color: 'bg-secondary/10 text-secondary',
    },
    {
      title: 'التقارير المالية',
      description: 'الرسوم البيانية والإحصائيات',
      icon: BarChart3,
      path: '/beneficiary/reports',
      color: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display truncate">مرحباً {currentBeneficiary?.name || 'بك'}</h1>
            <p className="text-muted-foreground mt-1 text-sm">واجهة المستفيد - عرض فقط</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FiscalYearSelector value={fiscalYearId} onChange={setSelectedFYId} showAll={false} />
            <ExportMenu hidePdf />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-foreground/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-primary-foreground/90">حصتي من الريع</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">نسبة حصتي</p>
                  <p className="text-lg sm:text-2xl font-bold">{currentBeneficiary?.share_percentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي ريع الوقف</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">{beneficiariesShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-bold mb-3">الوصول السريع</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickLinks.map((link) => (
              <Card
                key={link.path}
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(link.path)}
              >
                <CardContent className="p-3 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${link.color}`}>
                      <link.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Notifications */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" />
              آخر الإشعارات
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/beneficiary/notifications')}>
              عرض الكل
            </Button>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">لا توجد إشعارات جديدة</p>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{n.title}</p>
                        {!n.is_read && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">جديد</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BeneficiaryDashboard;
