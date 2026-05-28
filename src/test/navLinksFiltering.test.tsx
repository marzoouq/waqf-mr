/**
 * اختبار انحدار: useNavLinks يطبّق رؤية الأقسام والصلاحيات بصورة موحّدة (opt-out).
 *
 * يغطّي:
 *  - ناظر: قسم expenses=false → الرابط محذوف.
 *  - ناظر: settings و users محميان حتى لو حاول الإعداد إخفاءهما.
 *  - محاسب: غياب مفتاح الصلاحية لا يحجب الرابط (opt-out).
 *  - محاسب: false صريح يحجب الرابط.
 *  - مستفيد: قسم invoices=false يحذف /beneficiary/invoices دون التأثير على /beneficiary/expenses (دليل الفصل).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const authMock = vi.fn();
const sectionsMock = vi.fn();
const permsMock = vi.fn();

vi.mock('@/hooks/auth/session/useAuthContext', () => ({
  useAuth: () => authMock(),
}));
vi.mock('@/hooks/data/settings/app/useAppSettings', () => ({
  useAppSettings: () => ({ getJsonSetting: (_k: string, fb: unknown) => fb }),
}));
vi.mock('@/hooks/data/settings/permissions/useSectionsVisibility', () => ({
  useSectionsVisibility: () => sectionsMock(),
}));
vi.mock('@/hooks/data/settings/permissions/useRolePermissions', () => ({
  useRolePermissions: () => ({ getPermissionsForRole: (r: string) => permsMock(r) }),
}));

import { useNavLinks } from '@/hooks/application/useNavLinks';
import { defaultAdminSections, defaultBeneficiarySections } from '@/constants/navigation';

const tos = (links: { to: string }[]) => links.map((l) => l.to);

describe('useNavLinks - section visibility & permissions', () => {
  beforeEach(() => {
    authMock.mockReset();
    sectionsMock.mockReset();
    permsMock.mockReset();
  });

  it('ناظر: expenses=false يحجب الرابط', () => {
    authMock.mockReturnValue({ role: 'admin' });
    sectionsMock.mockReturnValue({
      adminSections: { ...defaultAdminSections, expenses: false },
      beneficiarySections: defaultBeneficiarySections,
    });
    permsMock.mockReturnValue({});
    const { result } = renderHook(() => useNavLinks());
    expect(tos(result.current)).not.toContain('/dashboard/expenses');
    expect(tos(result.current)).toContain('/dashboard/invoices');
  });

  it('ناظر: settings و users يبقيان حتى لو حاول الإعداد إخفاءهما', () => {
    authMock.mockReturnValue({ role: 'admin' });
    // محاكاة الحماية المطبَّقة فعلاً داخل useSectionsVisibility
    sectionsMock.mockReturnValue({
      adminSections: { ...defaultAdminSections, settings: true, users: true },
      beneficiarySections: defaultBeneficiarySections,
    });
    permsMock.mockReturnValue({});
    const { result } = renderHook(() => useNavLinks());
    expect(tos(result.current)).toContain('/dashboard/settings');
    expect(tos(result.current)).toContain('/dashboard/users');
  });

  it('محاسب (opt-out): غياب مفتاح الصلاحية لا يحجب الرابط', () => {
    authMock.mockReturnValue({ role: 'accountant' });
    sectionsMock.mockReturnValue({
      adminSections: defaultAdminSections,
      beneficiarySections: defaultBeneficiarySections,
    });
    permsMock.mockReturnValue({}); // لا توجد صلاحيات معرّفة
    const { result } = renderHook(() => useNavLinks());
    // /dashboard/accounts يجب أن يظهر رغم غياب مفتاحه
    expect(tos(result.current)).toContain('/dashboard/accounts');
    // ولكن المسارات المستثناة للمحاسب لا تظهر
    expect(tos(result.current)).not.toContain('/dashboard/settings');
    expect(tos(result.current)).not.toContain('/dashboard/users');
  });

  it('محاسب: false صريح يحجب الرابط', () => {
    authMock.mockReturnValue({ role: 'accountant' });
    sectionsMock.mockReturnValue({
      adminSections: defaultAdminSections,
      beneficiarySections: defaultBeneficiarySections,
    });
    permsMock.mockReturnValue({ accounts: false });
    const { result } = renderHook(() => useNavLinks());
    expect(tos(result.current)).not.toContain('/dashboard/accounts');
  });

  it('مستفيد: إخفاء قسم invoices لا يؤثر على رابط expenses (الفصل)', () => {
    authMock.mockReturnValue({ role: 'beneficiary' });
    sectionsMock.mockReturnValue({
      adminSections: defaultAdminSections,
      beneficiarySections: { ...defaultBeneficiarySections, invoices: false },
    });
    permsMock.mockReturnValue({});
    const { result } = renderHook(() => useNavLinks());
    expect(tos(result.current)).not.toContain('/beneficiary/invoices');
    expect(tos(result.current)).toContain('/beneficiary/expenses');
  });
});
