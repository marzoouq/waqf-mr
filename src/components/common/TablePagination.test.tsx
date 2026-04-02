import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TablePagination from './TablePagination';

describe('TablePagination', () => {
  it('returns null when only one page', () => {
    const { container } = render(
      <TablePagination currentPage={1} totalItems={5} itemsPerPage={10} onPageChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows correct range text', () => {
    render(
      <TablePagination currentPage={1} totalItems={25} itemsPerPage={10} onPageChange={() => {}} />
    );
    expect(screen.getByText('عرض 1 - 10 من 25')).toBeInTheDocument();
  });

  it('shows correct range for last page', () => {
    render(
      <TablePagination currentPage={3} totalItems={25} itemsPerPage={10} onPageChange={() => {}} />
    );
    expect(screen.getByText('عرض 21 - 25 من 25')).toBeInTheDocument();
  });

  it('calls onPageChange when clicking a page button', () => {
    const onPageChange = vi.fn();
    render(
      <TablePagination currentPage={1} totalItems={30} itemsPerPage={10} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous button on first page', () => {
    render(
      <TablePagination currentPage={1} totalItems={30} itemsPerPage={10} onPageChange={() => {}} />
    );
    const buttons = screen.getAllByRole('button');
    // First nav button (ChevronRight = previous in RTL)
    expect(buttons[0]).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <TablePagination currentPage={3} totalItems={30} itemsPerPage={10} onPageChange={() => {}} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });

  it('shows ellipsis for many pages', () => {
    render(
      <TablePagination currentPage={5} totalItems={100} itemsPerPage={10} onPageChange={() => {}} />
    );
    expect(screen.getAllByText('...').length).toBeGreaterThanOrEqual(1);
  });
});
