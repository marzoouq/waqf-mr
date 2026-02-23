import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, role: 'beneficiary' })),
}));

vi.mock('@/hooks/useBeneficiaries', () => ({
  useBeneficiariesSafe: vi.fn(() => ({ data: [
    { id: 'b1', user_id: 'user-1', name: 'محمد أحمد', share_percentage: 10, phone: '', email: '' },
  ] })),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(() => ({ data: [
    { id: 'n1', title: 'إشعار تجريبي', message: 'رسالة تجريبية', is_read: false, created_at: '2024-06-01T00:00:00Z', type: 'info' },
  ] })),
}));

vi.mock('@/hooks/useFiscalYears', () => ({
  useActiveFiscalYear: vi.fn(() => ({ data: { id: 'fy1', label: '1446-1447', status: 'active' }, fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }] })),
  useFiscalYears: vi.fn(() => ({ data: [{ id: 'fy1', label: '1446-1447', status: 'active' }], isLoading: false })),
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false, noPublishedYears: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/useFinancialSummary', () => ({
  useFinancialSummary: vi.fn(() => ({ availableAmount: 100000, isLoading: false, isError: false })),
}));

vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }));

import BeneficiaryDashboard from './BeneficiaryDashboard';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('BeneficiaryDashboard', () => {
  it('renders welcome message with beneficiary name', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('محمد أحمد')).toBeInTheDocument();
  });

  it('shows beneficiary share info', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    // Share is shown as amount, not percentage
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it('calculates my share correctly (10% of 100000)', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
  });

  it('shows total waqf revenue', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText(/100,000/)).toBeInTheDocument();
  });

  it('renders quick links', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('الإفصاح السنوي')).toBeInTheDocument();
    expect(screen.getAllByText('حصتي من الريع').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('التقارير المالية')).toBeInTheDocument();
    expect(screen.getByText('اللائحة التنظيمية')).toBeInTheDocument();
  });

  it('shows recent notifications', () => {
    renderWithRouter(<BeneficiaryDashboard />);
    expect(screen.getByText('إشعار تجريبي')).toBeInTheDocument();
  });
});
