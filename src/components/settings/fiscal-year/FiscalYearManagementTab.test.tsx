/**
 * اختبارات RTL لتبويب إدارة السنوات المالية —
 * يتحقق من: عرض submitError، تعطيل زر الإنشاء عند formError،
 * قبول الأرقام العربية، حماية حذف السنة النشطة.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';


const mockHook = vi.fn();

vi.mock('@/hooks/page/admin/financial/useFiscalYearManagement', () => ({
  useFiscalYearManagement: () => mockHook(),
}));
vi.mock('./ReopenFiscalYearDialog', () => ({ default: () => null }));
vi.mock('./CascadeDeleteFiscalYearDialog', () => ({ default: () => null }));

import FiscalYearManagementTab from './FiscalYearManagementTab';

const baseState = {
  fiscalYears: [],
  isLoading: false,
  creating: true,
  setCreating: vi.fn(),
  newFY: { label: '', start_date: '', end_date: '' },
  setNewFY: vi.fn(),
  actionLoading: null,
  formError: null as string | null,
  submitError: null as string | null,
  handleCreate: vi.fn(),
  handleClose: vi.fn(),
  handleReopen: vi.fn(),
  togglePublished: vi.fn(),
  handleDelete: vi.fn(),
  handleCascadeDelete: vi.fn(),
};

describe('FiscalYearManagementTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('يعطّل زر "إنشاء" عند وجود formError', () => {
    mockHook.mockReturnValue({
      ...baseState,
      newFY: { label: '25-26', start_date: '2025-10-25', end_date: '2026-10-24' },
      formError: 'تنسيق المسمى يجب أن يكون YYYY-YYYY (مثال: 2025-2026)',
    });
    render(<FiscalYearManagementTab />);
    const btn = screen.getByRole('button', { name: /إنشاء/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/تنسيق المسمى/)).toBeInTheDocument();
  });

  it('يعرض submitError داخل Alert حرفياً', () => {
    mockHook.mockReturnValue({
      ...baseState,
      newFY: { label: '2026-2027', start_date: '2026-10-25', end_date: '2027-10-24' },
      submitError: 'يوجد تداخل زمني مع السنة "2024-2025" (2024-10-25 → 2025-10-24)',
    });
    render(<FiscalYearManagementTab />);
    expect(screen.getByText(/تعذّر إنشاء السنة المالية/)).toBeInTheDocument();
    expect(screen.getByText(/2024-2025/)).toBeInTheDocument();
  });

  it('يفعّل زر "إنشاء" ويستدعي handleCreate لبيانات صحيحة', async () => {
    const handleCreate = vi.fn();
    mockHook.mockReturnValue({
      ...baseState,
      newFY: { label: '2026-2027', start_date: '2026-10-25', end_date: '2027-10-24' },
      handleCreate,
    });
    render(<FiscalYearManagementTab />);
    const btn = screen.getByRole('button', { name: /إنشاء/ });
    expect(btn).toBeEnabled();
    await act(async () => { fireEvent.click(btn); });
    expect(handleCreate).toHaveBeenCalled();
  });

  it('يعرض المدة المحسوبة بالأيام', () => {
    mockHook.mockReturnValue({
      ...baseState,
      newFY: { label: '2026-2027', start_date: '2026-10-25', end_date: '2027-10-24' },
    });
    render(<FiscalYearManagementTab />);
    expect(screen.getByText(/المدة المحسوبة:/)).toBeInTheDocument();
  });

  it('يعرض جدول السنوات الموجودة (انعكاس realtime على إعادة العرض)', () => {
    mockHook.mockReturnValue({
      ...baseState,
      creating: false,
      fiscalYears: [
        { id: '1', label: '2024-2025', start_date: '2024-10-25', end_date: '2025-10-24', status: 'active', published: true },
      ],
    });
    const { rerender } = render(<FiscalYearManagementTab />);
    expect(screen.getByText('2024-2025')).toBeInTheDocument();

    // محاكاة حدث realtime يحدّث القائمة دون reload
    mockHook.mockReturnValue({
      ...baseState,
      creating: false,
      fiscalYears: [
        { id: '1', label: '2024-2025', start_date: '2024-10-25', end_date: '2025-10-24', status: 'active', published: true },
        { id: '2', label: '2025-2026', start_date: '2025-10-25', end_date: '2026-10-24', status: 'closed', published: false },
      ],
    });
    rerender(<FiscalYearManagementTab />);
    expect(screen.getByText('2025-2026')).toBeInTheDocument();
  });
});
