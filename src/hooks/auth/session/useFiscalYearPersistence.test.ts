import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const state: { fiscalYears: Array<{ id: string }>; isSuccess: boolean } = { fiscalYears: [], isSuccess: false };
vi.mock('@/hooks/data/financial/fiscalYears/useFiscalYears', () => ({
  useActiveFiscalYear: () => state,
}));

import { useFiscalYearPersistence } from './useFiscalYearPersistence';

const CLOSED_ID = '97b5d2e2-5c61-4fd8-918c-52f2a87cad13';
const KEY = 'waqf_selected_fiscal_year';

describe('useFiscalYearPersistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(KEY, CLOSED_ID);
  });

  it('يحتفظ بالسنة المختارة عند تحديث الصفحة قبل أن تُجلب قائمة السنوات', () => {
    state.fiscalYears = []; state.isSuccess = false;
    const { result } = renderHook(() => useFiscalYearPersistence());
    expect(result.current.selectedId).toBe(CLOSED_ID);
    expect(sessionStorage.getItem(KEY)).toBe(CLOSED_ID);
  });

  it('يمسح الاختيار إذا لم تعد السنة موجودة بعد اكتمال الجلب', () => {
    state.fiscalYears = [{ id: '6ff4e357-1a78-4396-ab3e-c19c46c2c8a6' }]; state.isSuccess = true;
    const { result } = renderHook(() => useFiscalYearPersistence());
    expect(result.current.selectedId).toBe('');
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
