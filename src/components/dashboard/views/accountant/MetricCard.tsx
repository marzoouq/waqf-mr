/**
 * MetricCard — بطاقة مقياس سريعة قابلة للنقر (مع/بدون رابط)
 * مستخرجة من AccountantDashboardView لتحسين التركيب وإعادة الاستخدام.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  link?: string;
}

const MetricCard = memo(function MetricCard({
  title, value, subtitle, icon: Icon, color, link,
}: MetricCardProps) {
  const content = (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return link ? <Link to={link} className="block">{content}</Link> : content;
});

export default MetricCard;
