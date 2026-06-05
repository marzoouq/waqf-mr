import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CrudPagination from './CrudPagination';

describe('CrudPagination', () => {
  const defaultProps = {
    page: 0,
    pageSize: 500,
    currentCount: 500,
    hasNextPage: true,
    hasPrevPage: false,
    nextPage: vi.fn(),
    prevPage: vi.fn(),
  };

  it('لا يعرض شيئاً عند عدم وجود صفحات إضافية', () => {
    const { container } = render(
      <CrudPagination {...defaultProps} hasNextPage={false} hasPrevPage={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('يعرض نطاق العناصر الحالي', () => {
    render(<CrudPagination {...defaultProps} />);
    expect(screen.getByText(/عرض 1 - 500/)).toBeInTheDocument();
  });

  it('يعرض رقم الصفحة الصحيح', () => {
    render(<CrudPagination {...defaultProps} page={2} hasPrevPage />);
    expect(screen.getByText('صفحة 3')).toBeInTheDocument();
  });

  it('يعطّل زر السابق في الصفحة الأولى', () => {
    render(<CrudPagination {...defaultProps} />);
    const prevBtn = screen.getByLabelText('الصفحة السابقة');
    expect(prevBtn).toBeDisabled();
  });

  it('يفعّل زر السابق عند hasPrevPage', () => {
    render(<CrudPagination {...defaultProps} page={1} hasPrevPage />);
    const prevBtn = screen.getByLabelText('الصفحة السابقة');
    expect(prevBtn).not.toBeDisabled();
  });

  it('يستدعي nextPage عند الضغط على التالي', () => {
    const nextPage = vi.fn();
    render(<CrudPagination {...defaultProps} nextPage={nextPage} />);
    fireEvent.click(screen.getByLabelText('الصفحة التالية'));
    expect(nextPage).toHaveBeenCalledOnce();
  });

  it('يستدعي prevPage عند الضغط على السابق', () => {
    const prevPage = vi.fn();
    render(<CrudPagination {...defaultProps} page={1} hasPrevPage prevPage={prevPage} />);
    fireEvent.click(screen.getByLabelText('الصفحة السابقة'));
    expect(prevPage).toHaveBeenCalledOnce();
  });

  it('يعطّل زر التالي عند عدم وجود صفحة تالية', () => {
    render(<CrudPagination {...defaultProps} hasNextPage={false} hasPrevPage currentCount={200} page={1} />);
    const nextBtn = screen.getByLabelText('الصفحة التالية');
    expect(nextBtn).toBeDisabled();
  });

  it('يعرض + عند وجود صفحة تالية', () => {
    render(<CrudPagination {...defaultProps} />);
    expect(screen.getByText(/\+/)).toBeInTheDocument();
  });

  it('يعطّل الأزرار أثناء التحميل', () => {
    render(<CrudPagination {...defaultProps} page={1} hasPrevPage isLoading />);
    expect(screen.getByLabelText('الصفحة السابقة')).toBeDisabled();
    expect(screen.getByLabelText('الصفحة التالية')).toBeDisabled();
  });

  it('يحسب نطاق الصفحة الثانية بشكل صحيح', () => {
    render(<CrudPagination {...defaultProps} page={1} hasPrevPage currentCount={300} hasNextPage={false} />);
    expect(screen.getByText('عرض 501 - 800')).toBeInTheDocument();
  });
});
