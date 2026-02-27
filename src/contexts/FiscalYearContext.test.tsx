import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FiscalYearProvider, useFiscalYear } from './FiscalYearContext';

// Mock dependencies
const mockFiscalYears = [
  { id: 'fy-1', label: '1446-1447', start_date: '2024-10-01', end_date: '2025-10-01', status: 'active', published: true, created_at: '' },
  { id: 'fy-2', label: '1445-1446', start_date: '2023-10-01', end_date: '2024-10-01', status: 'closed', published: true, created_at: '' },
];

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: () => ({
    data: mockFiscalYears[0],
    fiscalYears: mockFiscalYears,
    isLoading: false,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'admin', user: { id: 'u1' } }),
}));

const TestConsumer = () => {
  const ctx = useFiscalYear();
  return (
    <div>
      <span data-testid="fy-id">{ctx.fiscalYearId}</span>
      <span data-testid="is-closed">{String(ctx.isClosed)}</span>
      <span data-testid="no-published">{String(ctx.noPublishedYears)}</span>
      <span data-testid="count">{ctx.fiscalYears.length}</span>
    </div>
  );
};

describe('FiscalYearContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides fiscal year data to children', () => {
    render(
      <FiscalYearProvider><TestConsumer /></FiscalYearProvider>
    );
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('defaults to active fiscal year for admin when no selection', () => {
    render(
      <FiscalYearProvider><TestConsumer /></FiscalYearProvider>
    );
    // admin with no stored selection and active FY → uses active FY id
    expect(screen.getByTestId('fy-id').textContent).toBe('fy-1');
  });

  it('persists selected fiscal year in localStorage', () => {
    localStorage.setItem('waqf_selected_fiscal_year', 'fy-2');
    render(
      <FiscalYearProvider><TestConsumer /></FiscalYearProvider>
    );
    expect(screen.getByTestId('fy-id').textContent).toBe('fy-2');
    expect(screen.getByTestId('is-closed').textContent).toBe('true');
  });

  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useFiscalYear must be used within FiscalYearProvider');
    consoleSpy.mockRestore();
  });

  it('shows noPublishedYears as false for admin', () => {
    render(
      <FiscalYearProvider><TestConsumer /></FiscalYearProvider>
    );
    expect(screen.getByTestId('no-published').textContent).toBe('false');
  });
});
