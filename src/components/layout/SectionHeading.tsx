import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface SectionHeadingProps {
  title: string;
  /** رقم صغير بجانب العنوان (مثل عدد العناصر) */
  count?: number;
  action?: { label: string; to: string };
  extra?: ReactNode;
}

/** عنوان قسم موحّد داخل الصفحات: عنوان + عدد اختياري + رابط «عرض الكل» */
const SectionHeading = ({ title, count, action, extra }: SectionHeadingProps) => (
  <div className="flex items-center justify-between gap-2 px-1 mb-2.5">
    <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
      {title}
      {typeof count === 'number' && count > 0 && (
        <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-warning/15 px-1.5 text-xs font-bold text-warning-foreground tabular-nums">
          {count}
        </span>
      )}
    </h2>
    {extra}
    {action && (
      <Link to={action.to} className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        {action.label}
      </Link>
    )}
  </div>
);

export default SectionHeading;
