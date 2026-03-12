import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileCardView from './MobileCardView';

interface Item { id: string; name: string; amount: number }

const items: Item[] = [
  { id: '1', name: 'عنصر أ', amount: 100 },
  { id: '2', name: 'عنصر ب', amount: 200 },
];

const defaultProps = {
  items,
  getKey: (i: Item) => i.id,
  getTitle: (i: Item) => i.name,
  getFields: (i: Item) => [{ label: 'المبلغ', value: String(i.amount) }],
};

describe('MobileCardView', () => {
  it('renders all items', () => {
    render(<MobileCardView {...defaultProps} />);
    expect(screen.getByText('عنصر أ')).toBeInTheDocument();
    expect(screen.getByText('عنصر ب')).toBeInTheDocument();
  });

  it('renders field labels and values', () => {
    render(<MobileCardView {...defaultProps} />);
    expect(screen.getAllByText('المبلغ')).toHaveLength(2);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MobileCardView {...defaultProps} getSubtitle={(i) => `فرعي ${i.id}`} />);
    expect(screen.getByText('فرعي 1')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(<MobileCardView {...defaultProps} getBadge={() => <span>شارة</span>} />);
    expect(screen.getAllByText('شارة')).toHaveLength(2);
  });

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = vi.fn();
    render(<MobileCardView {...defaultProps} onEdit={onEdit} />);
    const editButtons = screen.getAllByRole('button');
    await userEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(items[0]);
  });

  it('calls onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(<MobileCardView {...defaultProps} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button');
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(items[0]);
  });

  it('renders extra actions', () => {
    render(<MobileCardView {...defaultProps} extraActions={() => <button>إضافي</button>} />);
    expect(screen.getAllByText('إضافي')).toHaveLength(2);
  });

  it('renders empty when no items', () => {
    const { container } = render(<MobileCardView {...defaultProps} items={[]} />);
    expect(container.querySelectorAll('.shadow-sm')).toHaveLength(0);
  });

  it('renders multiple fields per item', () => {
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={(i) => [
          { label: 'المبلغ', value: `${i.amount} ريال` },
          { label: 'الحالة', value: 'نشط' },
        ]}
      />
    );
    expect(screen.getByText('المبلغ')).toBeInTheDocument();
    expect(screen.getByText('100 ريال')).toBeInTheDocument();
    expect(screen.getByText('الحالة')).toBeInTheDocument();
  });

  it('shows edit and delete buttons together', () => {
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
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('hides buttons when no callbacks provided', () => {
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

  it('renders skeleton cards when isLoading is true', () => {
    const { container } = render(
      <MobileCardView {...defaultProps} isLoading={true} skeletonCount={2} />
    );
    // Should NOT render actual items
    expect(screen.queryByText('عنصر أ')).not.toBeInTheDocument();
    // Should render skeleton cards
    expect(container.querySelectorAll('.shadow-sm')).toHaveLength(2);
  });

  it('renders default 3 skeletons when skeletonCount not specified', () => {
    const { container } = render(
      <MobileCardView {...defaultProps} isLoading={true} />
    );
    expect(container.querySelectorAll('.shadow-sm')).toHaveLength(3);
  });

  it('applies custom className to fields', () => {
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={() => [
          { label: 'ملاحظات', value: 'نص', className: 'col-span-2' },
        ]}
      />
    );
    const fieldEl = screen.getByText('ملاحظات').parentElement;
    expect(fieldEl).toHaveClass('col-span-2');
  });

  it('renders ReactNode values in fields', () => {
    render(
      <MobileCardView
        items={[items[0]]}
        getKey={(i) => i.id}
        getTitle={(i) => i.name}
        getFields={() => [
          { label: 'الحالة', value: <span data-testid="badge">نشط</span> },
        ]}
      />
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });
});
