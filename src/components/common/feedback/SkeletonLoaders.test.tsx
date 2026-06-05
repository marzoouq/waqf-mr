import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StatsGridSkeleton, TableSkeleton, KpiSkeleton, ChartSkeleton, DashboardSkeleton } from './SkeletonLoaders';

describe('SkeletonLoaders', () => {
  it('StatsGridSkeleton يعرض العدد المطلوب من البطاقات', () => {
    const { container } = render(<StatsGridSkeleton count={4} />);
    const cards = container.querySelectorAll('.shadow-sm');
    expect(cards.length).toBe(4);
  });

  it('StatsGridSkeleton يستخدم 9 كقيمة افتراضية', () => {
    const { container } = render(<StatsGridSkeleton />);
    const cards = container.querySelectorAll('.shadow-sm');
    expect(cards.length).toBe(9);
  });

  it('TableSkeleton يعرض الصفوف المطلوبة', () => {
    const { container } = render(<TableSkeleton rows={3} cols={2} />);
    expect(container.querySelector('.shadow-sm')).toBeInTheDocument();
  });

  it('KpiSkeleton يعرض 4 عناصر', () => {
    const { container } = render(<KpiSkeleton />);
    const items = container.querySelectorAll('.rounded-lg.bg-muted\\/30');
    expect(items.length).toBe(4);
  });

  it('ChartSkeleton يعرض بدون أخطاء', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.querySelector('.shadow-sm')).toBeInTheDocument();
  });

  it('DashboardSkeleton يعرض التخطيط الكامل', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
