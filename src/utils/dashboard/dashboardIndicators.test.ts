import { describe, it, expect } from 'vitest';
import { isUsingFallbackSharePct, resolveActiveContractsCount } from './dashboardIndicators';

describe('isUsingFallbackSharePct', () => {
  it('لا تنبيه عند ضبط نسبة الناظر 10 والواقف 5 مع غياب نسبة رقبة الوقف', () => {
    expect(isUsingFallbackSharePct({ admin_share_percentage: 10, waqif_share_percentage: 5 })).toBe(false);
  });
  it('تنبيه عند غياب نسبة الواقف', () => {
    expect(isUsingFallbackSharePct({ admin_share_percentage: 10, waqif_share_percentage: null })).toBe(true);
  });
});

describe('resolveActiveContractsCount', () => {
  const year = [{ status: 'active' }, { status: 'active' }, { status: 'active' }, { status: 'active' }, { status: 'expired' }];
  it('سنة محددة: 4 عقود نشطة من عقود السنة وليس 19 من الخادم', () => {
    expect(resolveActiveContractsCount(year, true, 19)).toBe(4);
  });
  it('كل السنوات: يستخدم عدد الخادم', () => {
    expect(resolveActiveContractsCount(year, false, 19)).toBe(19);
  });
  it('سنة مقفلة: العقد المحفوظ «نشط» وانتهى تاريخه لا يُعدّ نشطاً', () => {
    const closed = [
      { status: 'active', end_date: '2026-10-24' },
      { status: 'active', end_date: '2027-03-01' },
      { status: 'active', end_date: '2026-05-31' },
    ];
    expect(resolveActiveContractsCount(closed, true, 19, '2026-11-23')).toBe(1);
  });
});
