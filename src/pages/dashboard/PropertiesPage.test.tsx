import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock all external hooks
const mockProperties = [
  { id: 'p1', property_number: 'W-001', property_type: 'مبنى سكني', location: 'حي النزهة', area: 500, description: 'مبنى وقفي', created_at: '', updated_at: '' },
  { id: 'p2', property_number: 'W-002', property_type: 'أرض', location: 'حي الملك فهد', area: 1200, description: '', created_at: '', updated_at: '' },
];

const mockMutate = { mutateAsync: vi.fn(), isPending: false };

vi.mock('@/hooks/useProperties', () => ({
  useProperties: vi.fn(() => ({ data: mockProperties, isLoading: false })),
  useCreateProperty: vi.fn(() => mockMutate),
  useUpdateProperty: vi.fn(() => mockMutate),
  useDeleteProperty: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/useUnits', () => ({
  useUnits: vi.fn(() => ({ data: [] })),
  useCreateUnit: vi.fn(() => mockMutate),
  useUpdateUnit: vi.fn(() => mockMutate),
  useDeleteUnit: vi.fn(() => mockMutate),
  useAllUnits: vi.fn(() => ({ data: [
    { id: 'u1', property_id: 'p1', unit_number: '101', status: 'مؤجرة', unit_type: 'شقة', floor: 'أول', area: 100, notes: '', created_at: '', updated_at: '' },
    { id: 'u2', property_id: 'p1', unit_number: '102', status: 'شاغرة', unit_type: 'شقة', floor: 'أول', area: 100, notes: '', created_at: '', updated_at: '' },
  ] })),
}));

vi.mock('@/hooks/useContracts', () => ({
  useContracts: vi.fn(() => ({ data: [
    { id: 'c1', contract_number: 'C-001', property_id: 'p1', unit_id: 'u1', tenant_name: 'أحمد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 24000, status: 'active', payment_type: 'annual', payment_count: 1, notes: '', created_at: '', updated_at: '' },
  ] })),
  useContractsByFiscalYear: vi.fn(() => ({ data: [
    { id: 'c1', contract_number: 'C-001', property_id: 'p1', unit_id: 'u1', tenant_name: 'أحمد', start_date: '2024-01-01', end_date: '2025-01-01', rent_amount: 24000, status: 'active', payment_type: 'annual', payment_count: 1, notes: '', created_at: '', updated_at: '' },
  ] })),
  useCreateContract: vi.fn(() => mockMutate),
  useUpdateContract: vi.fn(() => mockMutate),
  useDeleteContract: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpenses: vi.fn(() => ({ data: [] })),
  useExpensesByFiscalYear: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/hooks/useTenantPayments', () => ({
  useTenantPayments: vi.fn(() => ({ data: [] })),
  useUpsertTenantPayment: vi.fn(() => mockMutate),
}));

vi.mock('@/hooks/usePdfWaqfInfo', () => ({
  usePdfWaqfInfo: vi.fn(() => ({ waqfName: 'وقف تجريبي', adminName: 'ناظر' })),
}));

vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/FiscalYearContext', () => ({
  useFiscalYear: vi.fn(() => ({
    fiscalYearId: 'fy1', setFiscalYearId: vi.fn(),
    fiscalYear: { id: 'fy1', label: '1446-1447', status: 'active', start_date: '2024-01-01', end_date: '2025-01-01' },
    fiscalYears: [{ id: 'fy1', label: '1446-1447', status: 'active' }],
    isClosed: false, isLoading: false,
  })),
  FiscalYearProvider: ({ children }: any) => children,
}));

vi.mock('@/utils/pdf', () => ({
  generatePropertiesPDF: vi.fn(),
  generateUnitsPDF: vi.fn(),
}));

import PropertiesPage from './PropertiesPage';

describe('PropertiesPage', () => {
  it('renders page title', () => {
    render(<PropertiesPage />);
    expect(screen.getByText('إدارة العقارات')).toBeInTheDocument();
  });

  it('renders property cards', () => {
    render(<PropertiesPage />);
    expect(screen.getByText('W-001')).toBeInTheDocument();
    expect(screen.getByText('W-002')).toBeInTheDocument();
  });

  it('displays property details on cards', () => {
    render(<PropertiesPage />);
    expect(screen.getByText('حي النزهة')).toBeInTheDocument();
    expect(screen.getAllByText('مبنى سكني').length).toBeGreaterThanOrEqual(1);
  });

  it('filters properties by search query', () => {
    render(<PropertiesPage />);
    const searchInput = screen.getByPlaceholderText('بحث في العقارات...');
    fireEvent.change(searchInput, { target: { value: 'النزهة' } });
    expect(screen.getByText('W-001')).toBeInTheDocument();
    expect(screen.queryByText('W-002')).not.toBeInTheDocument();
  });

  it('shows empty state when search has no results', () => {
    render(<PropertiesPage />);
    const searchInput = screen.getByPlaceholderText('بحث في العقارات...');
    fireEvent.change(searchInput, { target: { value: 'غير موجود' } });
    expect(screen.getByText('لا توجد نتائج للبحث')).toBeInTheDocument();
  });

  it('shows add property button', () => {
    render(<PropertiesPage />);
    expect(screen.getByText('إضافة عقار')).toBeInTheDocument();
  });

  it('shows unit occupancy indicators', () => {
    render(<PropertiesPage />);
    // Property p1 has 1 rented, 1 vacant out of 2 = 50%
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
