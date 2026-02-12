import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useAccounts } from '@/hooks/useAccounts';
import { useNotifications } from '@/hooks/useNotifications';
import { Wallet, FileText, BarChart3, Printer, PieChart, Calculator, Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const BeneficiaryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: accounts = [] } = useAccounts();
  const { data: notifications = [] } = useNotifications();

  const currentBeneficiary = beneficiaries.find(b => b.user_id === user?.id);
  const latestAccount = accounts[0];

  const totalIncome = Number(latestAccount?.total_income || 0);
  const waqfRevenue = Number(latestAccount?.waqf_revenue || 0);
  const waqfCorpusManual = Number(latestAccount?.waqf_corpus_manual || 0);
  const distributableAmount = waqfRevenue - waqfCorpusManual;
  const beneficiariesShare = distributableAmount;

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
      path: '/beneficiary/my-share',
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
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">مرحباً {currentBeneficiary?.name || 'بك'}</h1>
            <p className="text-muted-foreground mt-1">واجهة المستفيد - عرض فقط</p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm gradient-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-primary-foreground/90">حصتي من الريع</p>
                  <p className="text-2xl font-bold">{myShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نسبة حصتي</p>
                  <p className="text-2xl font-bold">{currentBeneficiary?.share_percentage || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي ريع الوقف</p>
                  <p className="text-2xl font-bold">{beneficiariesShare.toLocaleString()} ر.س</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-lg font-bold mb-3">الوصول السريع</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Card
                key={link.path}
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(link.path)}
              >
                <CardContent className="p-5">
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
