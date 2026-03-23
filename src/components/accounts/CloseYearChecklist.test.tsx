import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CloseYearChecklist from './CloseYearChecklist';
import type { ChecklistItem } from './closeYearChecklist.utils';

describe('CloseYearChecklist', () => {
  const passedItem: ChecklistItem = { label: 'تم بنجاح', passed: true, severity: 'warning' };
  const errorItem: ChecklistItem = { label: 'خطأ حرج', passed: false, severity: 'error', detail: 'تفاصيل الخطأ' };
  const warningItem: ChecklistItem = { label: 'تحذير', passed: false, severity: 'warning', detail: 'تفاصيل التحذير' };

  it('يعرض جميع العناصر', () => {
    render(<CloseYearChecklist items={[passedItem, errorItem, warningItem]} />);
    expect(screen.getByText('تم بنجاح')).toBeInTheDocument();
    expect(screen.getByText('خطأ حرج')).toBeInTheDocument();
    expect(screen.getByText('تحذير')).toBeInTheDocument();
  });

  it('يعرض تفاصيل العناصر الفاشلة فقط', () => {
    render(<CloseYearChecklist items={[passedItem, errorItem]} />);
    expect(screen.getByText('تفاصيل الخطأ')).toBeInTheDocument();
    // العنصر الناجح لا يعرض تفاصيل حتى لو كانت موجودة
  });

  it('يعرض رسالة تحذير عند وجود أخطاء حرجة', () => {
    render(<CloseYearChecklist items={[errorItem]} />);
    expect(screen.getByText(/عناصر حرجة/)).toBeInTheDocument();
  });

  it('لا يعرض رسالة تحذير عند عدم وجود أخطاء', () => {
    render(<CloseYearChecklist items={[passedItem, warningItem]} />);
    expect(screen.queryByText(/عناصر حرجة/)).not.toBeInTheDocument();
  });
});
