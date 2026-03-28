import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { FileText, TrendingUp, TrendingDown, Users, Wallet, Printer, Gauge, ArrowUpDown, Landmark, GitBranch } from 'lucide-react';

interface QuickActionsCardProps {
  role: string | null;
}

/** بطاقة الإجراءات السريعة في لوحة التحكم */
const QuickActionsCard = ({ role }: QuickActionsCardProps) => {
  if (role !== 'accountant' && role !== 'admin') return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {role === 'accountant' ? (
            <>
              <QuickAction to="/dashboard/income" icon={<TrendingUp className="w-5 h-5 text-success" />} label="تسجيل دخل" />
              <QuickAction to="/dashboard/expenses" icon={<TrendingDown className="w-5 h-5 text-destructive" />} label="تسجيل مصروف" />
              <QuickAction to="/dashboard/accounts" icon={<FileText className="w-5 h-5 text-primary" />} label="الحسابات الختامية" />
              <QuickAction to="/dashboard/invoices" icon={<FileText className="w-5 h-5 text-secondary" />} label="إدارة الفواتير" />
              <QuickAction to="/dashboard/chart-of-accounts" icon={<GitBranch className="w-5 h-5 text-accent-foreground" />} label="الشجرة المحاسبية" />
              <QuickAction to="/dashboard/comparison" icon={<ArrowUpDown className="w-5 h-5 text-muted-foreground" />} label="المقارنة التاريخية" />
              <QuickAction to="/dashboard/annual-report" icon={<Printer className="w-5 h-5 text-primary" />} label="التقرير السنوي" />
              <QuickAction to="/dashboard/reports" icon={<Gauge className="w-5 h-5 text-secondary" />} label="التقارير المالية" />
            </>
          ) : (
            <>
              <QuickAction to="/dashboard/contracts" icon={<FileText className="w-5 h-5 text-primary" />} label="مراجعة العقود" />
              <QuickAction to="/dashboard/beneficiaries" icon={<Users className="w-5 h-5 text-success" />} label="إدارة المستفيدين" />
              <QuickAction to="/dashboard/reports" icon={<Gauge className="w-5 h-5 text-warning" />} label="التقارير" />
              <QuickAction to="/dashboard/settings" icon={<Landmark className="w-5 h-5 text-muted-foreground" />} label="الإعدادات" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
      <Link to={to}>
        {icon}
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}

export default memo(QuickActionsCard);
