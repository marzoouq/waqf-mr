/**
 * بطاقات إحصاء المستخدمين حسب الدور
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldCheck, Calculator, UserCheck, Landmark } from 'lucide-react';
import { useUserRoleCounts } from '@/hooks/data/users/useUserRoleCounts';

const UserStatsCards = () => {
  const { data, isLoading } = useUserRoleCounts();

  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  const c = data ?? { total: 0, admin: 0, accountant: 0, beneficiary: 0, waqif: 0 };

  const items = [
    { label: 'إجمالي المستخدمين', value: c.total, icon: Users, color: 'text-primary' },
    { label: 'الناظر', value: c.admin, icon: ShieldCheck, color: 'text-success' },
    { label: 'المحاسبون', value: c.accountant, icon: Calculator, color: 'text-info' },
    { label: 'المستفيدون', value: c.beneficiary, icon: UserCheck, color: 'text-warning' },
    { label: 'الواقفون', value: c.waqif, icon: Landmark, color: 'text-accent-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {items.map((it) => (
        <Card key={it.label} className="shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/50 shrink-0">
              <it.icon className={`w-5 h-5 ${it.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{it.label}</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums">{it.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserStatsCards;
