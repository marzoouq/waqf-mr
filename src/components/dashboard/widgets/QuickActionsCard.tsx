import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { QUICK_ACTIONS } from '@/constants/quickActions';
import { ACCOUNTANT_EXCLUDED_ROUTES } from '@/constants/navigation';

interface QuickActionsCardProps {
  role: string | null;
}

/** بطاقة الإجراءات السريعة في لوحة التحكم */
const QuickActionsCard = ({ role }: QuickActionsCardProps) => {
  const actions = useMemo(() => {
    const raw = QUICK_ACTIONS[role ?? ''];
    if (!raw) return null;
    // تحصين دفاعي: لا تعرض أي إجراء يقع ضمن مسارات ممنوعة عن المحاسب
    if (role === 'accountant') {
      return raw.filter(a => !ACCOUNTANT_EXCLUDED_ROUTES.some(ex => a.to.startsWith(ex)));
    }
    return raw;
  }, [role]);

  if (!actions || actions.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" aria-hidden="true" />
          إجراءات سريعة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => (
            <QuickAction key={action.to} to={action.to} icon={<action.icon className={`w-5 h-5 ${action.iconClass}`} aria-hidden="true" />} label={action.label} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/** زر إجراء سريع — مكوّن خارج render لمنع إعادة التعريف */
const QuickAction = memo(function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Button asChild variant="outline" className="w-full gap-2 h-auto py-3 flex-col">
      <Link to={to} aria-label={label}>
        {icon}
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
});

export default memo(QuickActionsCard);
