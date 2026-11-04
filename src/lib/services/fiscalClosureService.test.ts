import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), year: { status: 'closed' }, summary: null as null | { overdue_count: number; overdue_amount: number; upcoming_count: number; upcoming_amount: number } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { fetchClosureDisclosure } from '@/lib/services/fiscalClosureService';

beforeEach(() => {
  mocks.from.mockClear();
  mocks.year = { status: 'closed' };
  mocks.summary = { overdue_count: 2, overdue_amount: 2000, upcoming_count: 16, upcoming_amount: 20200 };
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      maybeSingle: async () => ({ data: table === 'fiscal_years' ? mocks.year : mocks.summary, error: null }),
    };
    return chain;
  });
});

describe('الإفصاح التاريخي دون تعديل الحسابات', () => {
  it('يعرض لقطة 2000 ريال لفاتورتين و20200 ريال لـ16 قادمة دون قراءة الأرصدة الحالية', async () => {
    const text = await fetchClosureDisclosure('fy-closed');
    expect(text).toContain('2,000.00');
    expect(text).toContain('20,200.00');
    expect(mocks.from.mock.calls.map(args => args[0])).toEqual(['fiscal_years', 'fiscal_closure_summaries']);
  });
  it('لا يختلق لقطة لسنة أُقفلت قبل إضافة الإفصاح', async () => {
    mocks.summary = null;
    expect(await fetchClosureDisclosure('fy-old')).toContain('غير متاح');
  });
  it('لا يطبع إفصاح إقفال لسنة نشطة', async () => {
    mocks.year = { status: 'active' };
    expect(await fetchClosureDisclosure('fy-active')).toBeUndefined();
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});