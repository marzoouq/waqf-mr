/**
 * MetricCard — بطاقة مقياس سريعة قابلة للنقر (مع/بدون رابط)
 * يدعم AnimatedCounter للقيم العددية و MiniSparkline للاتجاه (Wave 3).
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter, MiniSparkline } from '@/components/common';
import type { TrendColor } from '@/types/dashboard';

interface MetricCardProps {
  title: string;
  /** القيمة كنص جاهز للعرض (يُستخدم عندما لا يتوفر rawValue) */
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  link?: string;
  /** القيمة العددية الأصلية لتشغيل AnimatedCounter */
  rawValue?: number;
  decimals?: number;
  prefix?: string;
  /** لاحقة عددية مثل " ر.س" أو "%" */
  numericSuffix?: string;
  /** سلسلة اتجاه آخر فترة */
  trend?: number[];
  trendColor?: TrendColor;
}

const MetricCard = memo(function MetricCard({
  title, value, subtitle, icon: Icon, color, link,
  rawValue, decimals = 0, prefix = '', numericSuffix = '',
  trend, trendColor,
}: MetricCardProps) {
  const hasRaw = typeof rawValue === 'number' && Number.isFinite(rawValue);
  const hasTrend = Array.isArray(trend) && trend.length > 1;

  const content = (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold tabular-nums">
            {hasRaw ? (
              <AnimatedCounter
                value={rawValue as number}
                decimals={decimals}
                prefix={prefix}
                suffix={numericSuffix}
              />
            ) : value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          {hasTrend && (
            <MiniSparkline
              data={trend as number[]}
              color={trendColor ?? 'primary'}
              className="mt-1 opacity-80"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
  return link ? <Link to={link} className="block">{content}</Link> : content;
});

export default MetricCard;
