/**
 * MiniSparkline — رسم بياني مصغّر داخل بطاقات KPI
 *
 * SVG خفيف بدون اعتماديات. يعرض اتجاه بيانات بسيط (إيرادات/مصروفات شهرية).
 */
import { useId } from 'react';

interface MiniSparklineProps {
  /** قيم البيانات بالترتيب الزمني */
  data: number[];
  /** اللون الأساسي (الافتراضي: primary) */
  color?: 'primary' | 'success' | 'destructive' | 'warning';
  /** العرض بالبكسل */
  width?: number;
  /** الارتفاع بالبكسل */
  height?: number;
  /** className اختياري */
  className?: string;
}

const COLOR_MAP: Record<NonNullable<MiniSparklineProps['color']>, string> = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  destructive: 'hsl(var(--destructive))',
  warning: 'hsl(var(--warning))',
};

export default function MiniSparkline({
  data,
  color = 'primary',
  width = 80,
  height = 24,
  className,
}: MiniSparklineProps) {
  const gradId = useId();

  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPath = `M 0,${height} L ${points
    .split(' ')
    .join(' L ')} L ${width},${height} Z`;

  const stroke = COLOR_MAP[color];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
