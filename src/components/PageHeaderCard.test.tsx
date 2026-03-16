import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import { Building2 } from 'lucide-react';
import PageHeaderCard from './PageHeaderCard';

describe('PageHeaderCard', () => {
  it('يعرض العنوان بشكل صحيح', () => {
    render(<PageHeaderCard title="العقارات" />);
    expect(screen.getByText('العقارات')).toBeInTheDocument();
  });

  it('يعرض الوصف عند تمريره', () => {
    render(<PageHeaderCard title="العقارات" description="إدارة العقارات الوقفية" />);
    expect(screen.getByText('إدارة العقارات الوقفية')).toBeInTheDocument();
  });

  it('لا يعرض الوصف عند عدم تمريره', () => {
    const { container } = render(<PageHeaderCard title="العقارات" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('يعرض الأيقونة عند تمريرها', () => {
    const { container } = render(<PageHeaderCard title="العقارات" icon={Building2} />);
    // الأيقونة داخل div مع gradient-gold
    expect(container.querySelector('.gradient-gold')).toBeInTheDocument();
  });

  it('لا يعرض الأيقونة عند عدم تمريرها', () => {
    const { container } = render(<PageHeaderCard title="العقارات" />);
    expect(container.querySelector('.gradient-gold')).toBeNull();
  });

  it('يعرض الشارة (badge) عند تمريرها', () => {
    render(<PageHeaderCard title="العقارات" badge={<span>تجريبي</span>} />);
    expect(screen.getByText('تجريبي')).toBeInTheDocument();
  });

  it('يعرض الإجراءات (actions) عند تمريرها', () => {
    render(<PageHeaderCard title="العقارات" actions={<button>إضافة</button>} />);
    expect(screen.getByText('إضافة')).toBeInTheDocument();
  });

  it('يطبق className إضافي عند تمريره', () => {
    const { container } = render(<PageHeaderCard title="العقارات" className="my-custom-class" />);
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });

  it('يحتوي على print:hidden للإخفاء أثناء الطباعة', () => {
    const { container } = render(<PageHeaderCard title="العقارات" />);
    expect(container.firstElementChild?.className).toContain('print:hidden');
  });
});
