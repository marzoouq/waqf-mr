/**
 * Mock لسياق السنة المالية — لاستهلاكه عبر vi.mock في E2E tests
 * يدعم تبديل السنة لاختبار إصلاح H-02 (إعادة الجلب عند تغيير fiscal_year_id).
 */
import { vi } from 'vitest';

export interface MockFiscalYearState {
  fiscalYearId: string;
  fiscalYear: { id: string; label: string; status: string; start_date: string; end_date: string } | null;
  isClosed: boolean;
  isSpecificYear: boolean;
}

const FY_ACTIVE = {
  id: 'fy-active-uuid',
  label: '2024-2025',
  status: 'active',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
};

const FY_CLOSED = {
  id: 'fy-closed-uuid',
  label: '2023-2024',
  status: 'closed',
  start_date: '2023-01-01',
  end_date: '2023-12-31',
};

export const mockState: MockFiscalYearState = {
  fiscalYearId: FY_ACTIVE.id,
  fiscalYear: FY_ACTIVE,
  isClosed: false,
  isSpecificYear: true,
};

export function resetMockFy() {
  mockState.fiscalYearId = FY_ACTIVE.id;
  mockState.fiscalYear = FY_ACTIVE;
  mockState.isClosed = false;
  mockState.isSpecificYear = true;
}

export function switchToClosedYear() {
  mockState.fiscalYearId = FY_CLOSED.id;
  mockState.fiscalYear = FY_CLOSED;
  mockState.isClosed = true;
}

export const useFiscalYearMock = vi.fn(() => ({
  fiscalYearId: mockState.fiscalYearId,
  fiscalYear: mockState.fiscalYear,
  fiscalYears: [FY_ACTIVE, FY_CLOSED],
  isClosed: mockState.isClosed,
  isLoading: false,
  noPublishedYears: false,
  isSpecificYear: mockState.isSpecificYear,
  setFiscalYearId: vi.fn((id: string) => {
    mockState.fiscalYearId = id;
    mockState.isClosed = id === FY_CLOSED.id;
    mockState.fiscalYear = id === FY_CLOSED.id ? FY_CLOSED : FY_ACTIVE;
  }),
}));

export { FY_ACTIVE, FY_CLOSED };
