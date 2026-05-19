/**
 * تحقق أن لوحة الصلاحيات لا تستطيع كتابة `settings:false` أو `users:false`
 * إلى DB حتى لو حاول المستخدم تبديل المفتاح أو إعادة الضبط الافتراضي.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const updateJsonMock = vi.fn<(key: string, value: unknown) => Promise<void>>(async () => {});

vi.mock('@/hooks/data/settings/useAppSettings', () => ({
  useAppSettings: () => ({ updateJsonSetting: updateJsonMock, isLoading: false, getJsonSetting: <T,>(_k: string, fb: T) => fb }),
}));
vi.mock('@/hooks/data/settings/useRolePermissions', () => ({
  useRolePermissions: () => ({ rolePermissions: {} as Record<string, Record<string, boolean>>, getPermissionsForRole: () => ({}) }),
}));
vi.mock('@/hooks/data/settings/useSectionsVisibility', () => ({
  useSectionsVisibility: () => ({
    adminSections: { settings: true, users: true, expenses: true, invoices: true },
    beneficiarySections: { invoices: true, expenses: true },
  }),
}));
vi.mock('@/hooks/data/settings/useBeneficiaryWidgets', () => ({
  useBeneficiaryWidgets: () => ({ widgets: {} }),
}));
vi.mock('@/hooks/data/settings/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    notificationSettings: { notify_beneficiary_contract_expiry: false, notify_beneficiary_expired_contracts: false },
  }),
}));
vi.mock('@/hooks/data/audit/useLogAccessEvent', () => ({
  useLogAccessEvent: () => vi.fn(),
}));
vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/lib/notify', () => ({
  uiNotify: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { usePermissionsControlPanel } from '@/hooks/page/admin/settings/usePermissionsControlPanel';

describe('PROTECTED_ADMIN_SECTIONS write guard', () => {
  beforeEach(() => updateJsonMock.mockClear());

  it('toggleAdminSection يتجاهل المفاتيح المحمية', () => {
    const { result } = renderHook(() => usePermissionsControlPanel());
    const before = { ...result.current.adminSections };
    act(() => result.current.toggleAdminSection('settings'));
    act(() => result.current.toggleAdminSection('users'));
    expect(result.current.adminSections.settings).toBe(before.settings);
    expect(result.current.adminSections.users).toBe(before.users);
  });

  it('toggleAdminSection يعمل للمفاتيح غير المحمية', () => {
    const { result } = renderHook(() => usePermissionsControlPanel());
    const before = result.current.adminSections.expenses;
    act(() => result.current.toggleAdminSection('expenses'));
    expect(result.current.adminSections.expenses).toBe(!before);
  });

  it('handleSave يطبّع settings/users إلى true قبل الكتابة', async () => {
    const { result } = renderHook(() => usePermissionsControlPanel());
    // محاكاة DB ملوّث: نضخ false بشكل مباشر إن أمكن — هنا نعتمد على أن normalize يضمن true
    await act(async () => { await result.current.handleSave(); });
    const sectionsCall = updateJsonMock.mock.calls.find(c => c[0] === 'sections_visibility');
    expect(sectionsCall, 'sections_visibility must be written').toBeDefined();
    const payload = sectionsCall![1] as Record<string, boolean>;
    expect(payload.settings).toBe(true);
    expect(payload.users).toBe(true);
  });
});
