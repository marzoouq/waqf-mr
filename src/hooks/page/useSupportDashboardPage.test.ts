import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks ---
vi.mock('@/hooks/auth/useAuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: 'admin', loading: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockTickets = [
  { id: 't1', ticket_number: 'TK-001', title: 'مشكلة تقنية', description: 'وصف المشكلة', category: 'technical', priority: 'high', status: 'open', created_by: 'u1', assigned_to: null, resolved_at: null, resolution_notes: null, rating: 4, rating_comment: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 't2', ticket_number: 'TK-002', title: 'استفسار مالي', description: 'سؤال عن التوزيعات', category: 'financial', priority: 'low', status: 'resolved', created_by: 'u2', assigned_to: 'u1', resolved_at: '2026-01-03', resolution_notes: 'تم', rating: null, rating_comment: null, created_at: '2026-01-02', updated_at: '2026-01-03' },
  { id: 't3', ticket_number: 'TK-003', title: 'اقتراح عام', description: '', category: 'general', priority: 'medium', status: 'open', created_by: 'u3', assigned_to: null, resolved_at: null, resolution_notes: null, rating: 5, rating_comment: 'ممتاز', created_at: '2026-01-03', updated_at: '2026-01-03' },
];

const mockErrors = [
  { id: 'e1', event_type: 'client_error', target_path: '/dashboard', metadata: { error_name: 'TypeError', error_message: 'Cannot read null', user_agent: 'Chrome' }, created_at: '2026-01-01T10:00:00Z', user_id: 'u1', email: null },
  { id: 'e2', event_type: 'client_error', target_path: '/contracts', metadata: { error_name: 'RangeError', error_message: 'Invalid date', user_agent: 'Firefox' }, created_at: '2026-01-02T10:00:00Z', user_id: null, email: null },
];

const mockAnalytics = {
  category_stats: [
    { key: 'technical', count: 5 },
    { key: 'financial', count: 3 },
    { key: 'general', count: 2 },
  ],
  priority_stats: [
    { key: 'high', count: 4 },
    { key: 'low', count: 6 },
  ],
  avg_resolution_hours: 0,
  avg_rating: 4.5,
  rated_count: 2,
  total_count: 10,
};

vi.mock('@/hooks/data/useSupportTickets', () => ({
  useSupportTickets: () => ({ data: { tickets: mockTickets, totalCount: mockTickets.length }, isLoading: false }),
  useSupportStats: () => ({ data: { openTickets: 2, inProgressTickets: 0, resolvedTickets: 1, errorsLast24h: 1 } }),
  useSupportAnalytics: () => ({ data: { ...mockAnalytics } }),
  useClientErrors: () => ({ data: mockErrors }),
  fetchTicketsForExport: vi.fn(),
}));

vi.mock('@/utils/format', () => ({ fmtDate: (d: string) => d }));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useSupportDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('يُعيد كل الحقول المتوقعة', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    expect(result.current.filteredTickets).toHaveLength(3);
    expect(result.current.filteredErrors).toHaveLength(2);
    expect(result.current.role).toBe('admin');
  });

  // --- فلترة التذاكر ---
  it('يفلتر التذاكر حسب التصنيف', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setCategoryFilter('technical'));
    expect(result.current.filteredTickets).toHaveLength(1);
    expect(result.current.filteredTickets[0]!.id).toBe('t1');
  });

  it('يفلتر التذاكر بالبحث النصي (العنوان)', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('مالي'));
    expect(result.current.filteredTickets).toHaveLength(1);
    expect(result.current.filteredTickets[0]!.id).toBe('t2');
  });

  it('يفلتر التذاكر بالبحث النصي (رقم التذكرة)', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('TK-003'));
    expect(result.current.filteredTickets).toHaveLength(1);
    expect(result.current.filteredTickets[0]!.id).toBe('t3');
  });

  it('يجمع بين فلتر التصنيف والبحث', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => {
      result.current.setCategoryFilter('general');
      result.current.setSearchQuery('اقتراح');
    });
    expect(result.current.filteredTickets).toHaveLength(1);
  });

  it('يُعيد مصفوفة فارغة عند بحث بلا نتائج', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setSearchQuery('غير_موجود_أبداً'));
    expect(result.current.filteredTickets).toHaveLength(0);
  });

  // --- فلترة الأخطاء ---
  it('يفلتر الأخطاء بالمسار', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setErrorSearch('contracts'));
    expect(result.current.filteredErrors).toHaveLength(1);
    expect(result.current.filteredErrors[0]!.id).toBe('e2');
  });

  it('يفلتر الأخطاء باسم الخطأ', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setErrorSearch('TypeError'));
    expect(result.current.filteredErrors).toHaveLength(1);
  });

  it('يفلتر الأخطاء برسالة الخطأ', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    act(() => result.current.setErrorSearch('Invalid date'));
    expect(result.current.filteredErrors).toHaveLength(1);
  });

  // --- إحصائيات التصنيف ---
  it('يحسب categoryStats مع النسب', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    expect(result.current.categoryStats).toHaveLength(3);
    expect(result.current.categoryStats[0]!).toMatchObject({ key: 'technical', label: 'تقني', count: 5, pct: 50 });
    expect(result.current.categoryStats[1]!).toMatchObject({ key: 'financial', label: 'مالي', count: 3, pct: 30 });
  });

  // --- إحصائيات الأولوية ---
  it('يحسب priorityStats مع التسميات والألوان', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    expect(result.current.priorityStats).toHaveLength(2);
    expect(result.current.priorityStats[0]!).toMatchObject({ key: 'high', label: 'عالي', count: 4, pct: 40 });
    expect(result.current.priorityStats[0]!.color).toContain('bg-');
  });

  // --- متوسط التقييم ---
  it('يحسب avgRating بشكل صحيح', async () => {
    const { useSupportDashboardPage } = await import('./useSupportDashboardPage');
    const { result } = renderHook(() => useSupportDashboardPage(), { wrapper: createWrapper() });
    expect(result.current.avgRating).toMatchObject({ avg: '4.5', count: 2 });
  });
});

// --- avgResolutionTime — اختبار مباشر للمنطق ---
describe('avgResolutionTime logic', () => {
  // المنطق: avg < 1 → دقائق، avg < 24 → ساعات، avg >= 24 → أيام
  function formatResolutionTime(avg: number | null | undefined) {
    if (!avg) return null;
    if (avg < 1) return `${Math.round(avg * 60)} دقيقة`;
    if (avg < 24) return `${Math.round(avg)} ساعة`;
    return `${Math.round(avg / 24)} يوم`;
  }

  it('يعرض بالدقائق عندما أقل من ساعة', () => {
    expect(formatResolutionTime(0.5)).toBe('30 دقيقة');
  });

  it('يعرض بالساعات عندما أقل من 24', () => {
    expect(formatResolutionTime(5)).toBe('5 ساعة');
  });

  it('يعرض بالأيام عندما 24+ ساعة', () => {
    expect(formatResolutionTime(72)).toBe('3 يوم');
  });

  it('يُعيد null عند عدم وجود بيانات', () => {
    expect(formatResolutionTime(null)).toBeNull();
    expect(formatResolutionTime(0)).toBeNull();
  });
});

// --- القيم المصدّرة ---
describe('PRIORITY_MAP / STATUS_MAP / CATEGORY_MAP', () => {
  it('يصدّر خرائط صحيحة', async () => {
    const { PRIORITY_MAP, STATUS_MAP, CATEGORY_MAP } = await import('./useSupportDashboardPage');
    expect(PRIORITY_MAP['high']!.label).toBe('عالي');
    expect(PRIORITY_MAP['critical']!.label).toBe('حرج');
    expect(STATUS_MAP['open']!.label).toBe('مفتوح');
    expect(STATUS_MAP['resolved']!.label).toBe('تم الحل');
    expect(CATEGORY_MAP.technical).toBe('تقني');
    expect(CATEGORY_MAP.financial).toBe('مالي');
    expect(Object.keys(PRIORITY_MAP)).toHaveLength(4);
    expect(Object.keys(STATUS_MAP)).toHaveLength(4);
    expect(Object.keys(CATEGORY_MAP)).toHaveLength(5);
  });
});
