/**
 * اختبارات وحدة لـ isActiveLink — يضمن سلوكاً موحداً عبر Sidebar و BottomNav
 */
import { describe, it, expect } from 'vitest';
import { isActiveLink } from './isActiveLink';

describe('isActiveLink', () => {
  it('يعيد true للمطابقة التامة', () => {
    expect(isActiveLink('/dashboard/properties', '/dashboard/properties')).toBe(true);
  });

  it('يعيد true لمسار فرعي تحت رابط غير جذر', () => {
    expect(isActiveLink('/dashboard/properties/123', '/dashboard/properties')).toBe(true);
  });

  it('يعيد false لجذر "/dashboard" عند زيارة صفحة فرعية', () => {
    expect(isActiveLink('/dashboard/properties', '/dashboard')).toBe(false);
  });

  it('يعيد false لجذر "/beneficiary" عند زيارة صفحة فرعية', () => {
    expect(isActiveLink('/beneficiary/my-share', '/beneficiary')).toBe(false);
  });

  it('يعيد false لجذر "/waqif" عند زيارة مسار /beneficiary/*', () => {
    expect(isActiveLink('/beneficiary/properties', '/waqif')).toBe(false);
  });

  it('يعيد true للمطابقة التامة على الجذر', () => {
    expect(isActiveLink('/dashboard', '/dashboard')).toBe(true);
    expect(isActiveLink('/waqif', '/waqif')).toBe(true);
  });

  it('لا يخدع بمسارات تشترك في prefix', () => {
    expect(isActiveLink('/dashboard/properties-old', '/dashboard/properties')).toBe(false);
  });
});
