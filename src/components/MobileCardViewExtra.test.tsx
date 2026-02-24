import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileCardView from './MobileCardView';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

const items: TestItem[] = [
  { id: '1', name: 'عنصر أول', value: 100 },
  { id: '2', name: 'عنصر ثاني', value: 200 },
];

describe('MobileCardView – اختبارات إضافية', () => {
  it('يعرض العناصر مع العنوان', () => {
    render(
      <MobileCardView
        items={items}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={(i) => [{ label: 'القيمة', value: String(i.value) }]}
      />
    );
    expect(screen.getByText('عنصر أول')).toBeInTheDocument();
    expect(screen.getByText('عنصر ثاني')).toBeInTheDocument();
  });

  it('يعرض العنوان الفرعي عند تمريره', () => {
    render(
      <MobileCardView
        items={items}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getSubtitle={(i) => `قيمة: ${i.value}`}
        getFields={() => []}
      />
    );
    expect(screen.getByText('قيمة: 100')).toBeInTheDocument();
  });

  it('يعرض حقول البيانات', () => {
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={(i) => [
          { label: 'المبلغ', value: `${i.value} ريال` },
          { label: 'الحالة', value: 'نشط' },
        ]}
      />
    );
    expect(screen.getByText('المبلغ')).toBeInTheDocument();
    expect(screen.getByText('100 ريال')).toBeInTheDocument();
    expect(screen.getByText('الحالة')).toBeInTheDocument();
  });

  it('يستدعي onEdit عند النقر', () => {
    const onEdit = vi.fn();
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={() => []}
        onEdit={onEdit}
      />
    );
    const editBtn = screen.getByRole('button');
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(items[0]);
  });

  it('يعرض أزرار الحذف والتعديل معاً', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={() => []}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('لا يعرض أزرار عند عدم تمرير callbacks', () => {
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={() => []}
      />
    );
    expect(screen.queryAllByRole('button').length).toBe(0);
  });
});
