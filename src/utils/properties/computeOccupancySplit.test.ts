/**
 * اختبارات منطق تقسيم الإشغال (بند 9 — PR #3)
 * يغطي: نشط/غير نشط، عقارات بدون وحدات، عقد بدون unit_id (whole-property)،
 * وأن العقارات بدون وحدات لا تُحتسب ضمن قاعدة الإشغال.
 */
import { describe, it, expect } from 'vitest';
import { computeOccupancySplit } from './computeOccupancySplit';

const P = (id: string) => ({ id });
const U = (id: string, property_id: string) => ({ id, property_id });
const C = (overrides: Partial<{ unit_id: string | null; property_id: string | null; status: string }>) => ({
  unit_id: null,
  property_id: null,
  status: 'active',
  ...overrides,
});

describe('computeOccupancySplit (بند 9)', () => {
  it('يفصل الوحدات الشاغرة عن العقارات بدون وحدات', () => {
    const r = computeOccupancySplit({
      properties: [P('p1'), P('p2')],
      units: [U('u1', 'p1'), U('u2', 'p1')],
      contracts: [C({ unit_id: 'u1', property_id: 'p1' })],
      isSpecificYear: true,
    });
    expect(r.totalUnits).toBe(2);
    expect(r.totalRented).toBe(1);
    expect(r.totalVacant).toBe(1); // u2 شاغرة
    expect(r.propertiesWithoutUnits).toBe(1); // p2 بلا وحدات
    expect(r.propertiesWithoutUnitsRented).toBe(0);
  });

  it('لا يحتسب العقارات بدون وحدات ضمن قاعدة الإشغال', () => {
    const r = computeOccupancySplit({
      properties: [P('p1'), P('p2'), P('p3')],
      units: [U('u1', 'p1')],
      contracts: [C({ unit_id: 'u1', property_id: 'p1' })],
      isSpecificYear: true,
    });
    expect(r.occupancyBase).toBe(1);
    expect(r.overallOccupancy).toBe(100);
    expect(r.propertiesWithoutUnits).toBe(2);
  });

  it('whole-property على عقار بلا وحدات يُعلَّم rented دون رفع قاعدة الإشغال', () => {
    const r = computeOccupancySplit({
      properties: [P('p1')],
      units: [],
      contracts: [C({ property_id: 'p1' })],
      isSpecificYear: true,
    });
    expect(r.propertiesWithoutUnits).toBe(1);
    expect(r.propertiesWithoutUnitsRented).toBe(1);
    expect(r.totalRented).toBe(0);
    expect(r.totalVacant).toBe(0);
    expect(r.occupancyBase).toBe(0);
    expect(r.overallOccupancy).toBe(0);
  });

  it('whole-property على عقار له وحدات يحتسب كل الوحدات مؤجَّرة', () => {
    const r = computeOccupancySplit({
      properties: [P('p1')],
      units: [U('u1', 'p1'), U('u2', 'p1')],
      contracts: [C({ property_id: 'p1' })],
      isSpecificYear: true,
    });
    expect(r.totalRented).toBe(2);
    expect(r.totalVacant).toBe(0);
    expect(r.overallOccupancy).toBe(100);
    expect(r.propertiesWithoutUnits).toBe(0);
  });

  it('يستثني العقود غير النشطة عندما isSpecificYear=false', () => {
    const r = computeOccupancySplit({
      properties: [P('p1')],
      units: [U('u1', 'p1')],
      contracts: [C({ unit_id: 'u1', property_id: 'p1', status: 'expired' })],
      isSpecificYear: false,
    });
    expect(r.totalRented).toBe(0);
    expect(r.totalVacant).toBe(1);
  });

  it('يدرج كل العقود (نشطة أو لا) عندما isSpecificYear=true', () => {
    const r = computeOccupancySplit({
      properties: [P('p1')],
      units: [U('u1', 'p1')],
      contracts: [C({ unit_id: 'u1', property_id: 'p1', status: 'expired' })],
      isSpecificYear: true,
    });
    expect(r.totalRented).toBe(1);
    expect(r.totalVacant).toBe(0);
  });

  it('قاعدة فارغة → 0% بدون قسمة على صفر', () => {
    const r = computeOccupancySplit({
      properties: [],
      units: [],
      contracts: [],
      isSpecificYear: true,
    });
    expect(r.overallOccupancy).toBe(0);
    expect(r.occupancyBase).toBe(0);
  });

  it('سيناريو مختلط: مؤجَّر + شاغر + بدون وحدات + بدون وحدات مؤجَّر كاملاً', () => {
    const r = computeOccupancySplit({
      properties: [P('p1'), P('p2'), P('p3'), P('p4')],
      units: [U('u1', 'p1'), U('u2', 'p1'), U('u3', 'p2')],
      contracts: [
        C({ unit_id: 'u1', property_id: 'p1' }),     // u1 مؤجَّرة
        C({ property_id: 'p4' }),                     // p4 بلا وحدات — مؤجَّر كاملاً
      ],
      isSpecificYear: true,
    });
    expect(r.totalUnits).toBe(3);
    expect(r.totalRented).toBe(1);
    expect(r.totalVacant).toBe(2); // u2 + u3
    expect(r.propertiesWithoutUnits).toBe(2); // p3, p4
    expect(r.propertiesWithoutUnitsRented).toBe(1); // p4
    expect(r.occupancyBase).toBe(3);
    expect(r.overallOccupancy).toBe(33);
  });
});
