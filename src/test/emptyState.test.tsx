import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '@/components/common/EmptyState';

describe('EmptyState — مكوّن الحالة الفارغة', () => {
  it('يعرض العنوان والوصف', () => {
    render(<EmptyState title="لا توجد بيانات" description="أضف بيانات جديدة" />);
    expect(screen.getByText('لا توجد بيانات')).toBeInTheDocument();
    expect(screen.getByText('أضف بيانات جديدة')).toBeInTheDocument();
  });

  it('يعرض بدون وصف', () => {
    render(<EmptyState title="فارغ" />);
    expect(screen.getByText('فارغ')).toBeInTheDocument();
  });
});
