import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FiscalYearSelector from './FiscalYearSelector';

const mockFiscalYears = [
  { id: 'fy1', label: '1446-1447', start_date: '2024-10-25', end_date: '2025-10-25', status: 'active' as const, created_at: '' },
  { id: 'fy2', label: '1445-1446', start_date: '2023-10-25', end_date: '2024-10-25', status: 'closed' as const, created_at: '' },
];

vi.mock('@/hooks/useFiscalYears', () => ({
  useFiscalYears: vi.fn(() => ({ data: mockFiscalYears, isLoading: false })),
  useActiveFiscalYear: vi.fn(),
}));

// Need to get the mock reference for per-test overrides
import { useFiscalYears } from '@/hooks/useFiscalYears';
const mockedUseFiscalYears = vi.mocked(useFiscalYears);

describe('FiscalYearSelector', () => {
  it('renders without crashing', () => {
    render(<FiscalYearSelector value="all" onChange={vi.fn()} />);
    expect(screen.getByText('جميع السنوات')).toBeInTheDocument();
  });

  it('shows "all years" option when showAll is true', () => {
    render(<FiscalYearSelector value="all" onChange={vi.fn()} showAll />);
    expect(screen.getByText('جميع السنوات')).toBeInTheDocument();
  });

  it('hides "all years" option when showAll is false', () => {
    render(<FiscalYearSelector value="fy1" onChange={vi.fn()} showAll={false} />);
    expect(screen.queryByText('جميع السنوات')).not.toBeInTheDocument();
  });

  it('displays active badge for active fiscal year', () => {
    render(<FiscalYearSelector value="fy1" onChange={vi.fn()} />);
    expect(screen.getByText('نشطة')).toBeInTheDocument();
  });

  it('renders skeleton while loading', () => {
    mockedUseFiscalYears.mockReturnValueOnce({ data: [], isLoading: true } as any);
    const { container } = render(<FiscalYearSelector value="all" onChange={vi.fn()} />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });
});
