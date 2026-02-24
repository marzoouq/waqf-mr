import { describe, it, expect } from 'vitest';
import {
  EXPENSE_TYPES, PROPERTY_TYPES, CONTRACT_STATUSES,
  PAYMENT_TYPES, ROLE_LABELS, UNIT_TYPES,
  DEFAULT_BANNER_SETTINGS, BANNER_COLORS,
} from './index';

describe('Constants', () => {
  it('EXPENSE_TYPES يحتوي على جميع أنواع المصروفات', () => {
    expect(EXPENSE_TYPES).toContain('كهرباء');
    expect(EXPENSE_TYPES).toContain('صيانة');
    expect(EXPENSE_TYPES).toContain('أخرى');
    expect(EXPENSE_TYPES.length).toBeGreaterThanOrEqual(7);
  });

  it('PROPERTY_TYPES يحتوي على أنواع العقارات', () => {
    expect(PROPERTY_TYPES).toContain('شقة');
    expect(PROPERTY_TYPES).toContain('محل تجاري');
  });

  it('CONTRACT_STATUSES يحتوي على الحالات الأساسية', () => {
    expect(CONTRACT_STATUSES.active).toBe('ساري');
    expect(CONTRACT_STATUSES.expired).toBe('منتهي');
    expect(CONTRACT_STATUSES.cancelled).toBe('ملغي');
  });

  it('PAYMENT_TYPES يحتوي على أنواع الدفع', () => {
    expect(PAYMENT_TYPES.monthly).toBe('شهري');
    expect(PAYMENT_TYPES.annual).toBe('سنوي');
  });

  it('ROLE_LABELS يحتوي على كل الأدوار', () => {
    expect(ROLE_LABELS.admin).toBe('ناظر الوقف');
    expect(ROLE_LABELS.beneficiary).toBe('مستفيد');
    expect(ROLE_LABELS.waqif).toBe('واقف');
    expect(ROLE_LABELS.accountant).toBe('محاسب');
  });

  it('UNIT_TYPES يحتوي على أنواع الوحدات', () => {
    expect(UNIT_TYPES).toContain('شقة');
    expect(UNIT_TYPES).toContain('محل');
  });

  it('DEFAULT_BANNER_SETTINGS له قيم افتراضية صحيحة', () => {
    expect(DEFAULT_BANNER_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_BANNER_SETTINGS.color).toBe('amber');
    expect(DEFAULT_BANNER_SETTINGS.dismissible).toBe(true);
  });

  it('BANNER_COLORS يحتوي على ألوان مختلفة', () => {
    expect(BANNER_COLORS.length).toBeGreaterThanOrEqual(3);
    expect(BANNER_COLORS[0]).toHaveProperty('value');
    expect(BANNER_COLORS[0]).toHaveProperty('label');
    expect(BANNER_COLORS[0]).toHaveProperty('className');
  });
});
