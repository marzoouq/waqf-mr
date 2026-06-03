/**
 * منطق تقسيم الإشغال (بند 9):
 *   - وحدات شاغرة = وحدات بلا عقد فعّال
 *   - عقارات بدون وحدات = عقارات لم تُعرَّف لها وحدات (مفصول عن الشواغر)
 *   - قاعدة نسبة الإشغال تعتمد على الوحدات فقط
 *
 * دالة نقية — مستخدمة في usePropertiesSummary (الناظر) و usePropertiesViewPage (المستفيد)
 * ومُغطّاة بـ Vitest في computeOccupancySplit.test.ts.
 */

export interface OccupancyContractLike {
  unit_id?: string | null;
  property_id?: string | null;
  status?: string | null;
}

export interface OccupancyPropertyLike { id: string }
export interface OccupancyUnitLike { id?: string | null; property_id?: string | null }

export interface OccupancySplitResult {
  totalUnits: number;
  totalRented: number;
  /** وحدات شاغرة فقط — لا تشمل العقارات بدون وحدات */
  totalVacant: number;
  /** عقارات لم تُعرَّف لها وحدات (سواء مؤجَّرة كاملاً أو لا) */
  propertiesWithoutUnits: number;
  /** منها مؤجَّرة كاملاً عبر whole-property contract */
  propertiesWithoutUnitsRented: number;
  /** قاعدة الإشغال = totalRented + totalVacant (لا تشمل العقارات بدون وحدات) */
  occupancyBase: number;
  overallOccupancy: number;
}

export function computeOccupancySplit(params: {
  properties: OccupancyPropertyLike[];
  units: OccupancyUnitLike[];
  contracts: OccupancyContractLike[];
  /** true عند عرض سنة محددة — كل العقود تُحتسب؛ false → نشطة فقط */
  isSpecificYear: boolean;
}): OccupancySplitResult {
  const { properties, units, contracts, isSpecificYear } = params;

  const rentedUnitIds = new Set(
    contracts
      .filter(c => (isSpecificYear || c.status === 'active') && c.unit_id)
      .map(c => c.unit_id as string),
  );
  const wholePropertyIds = new Set(
    contracts
      .filter(c => (isSpecificYear || c.status === 'active') && !c.unit_id && c.property_id)
      .map(c => c.property_id as string),
  );

  let totalRented = 0;
  let totalVacant = 0;
  let propertiesWithoutUnits = 0;
  let propertiesWithoutUnitsRented = 0;

  for (const p of properties) {
    const pUnits = units.filter(u => u.property_id === p.id);
    if (pUnits.length > 0) {
      const rentedUnits = pUnits.filter(u => u.id && rentedUnitIds.has(u.id)).length;
      if (wholePropertyIds.has(p.id)) {
        totalRented += pUnits.length;
      } else {
        totalRented += rentedUnits;
        totalVacant += pUnits.length - rentedUnits;
      }
    } else {
      propertiesWithoutUnits += 1;
      if (wholePropertyIds.has(p.id)) propertiesWithoutUnitsRented += 1;
    }
  }

  const totalUnits = units.length;
  const occupancyBase = totalRented + totalVacant;
  const overallOccupancy = occupancyBase > 0 ? Math.round((totalRented / occupancyBase) * 100) : 0;

  return {
    totalUnits,
    totalRented,
    totalVacant,
    propertiesWithoutUnits,
    propertiesWithoutUnitsRented,
    occupancyBase,
    overallOccupancy,
  };
}
