/**
 * usePropertiesAggregateMaps — خرائط تجميعية للعقارات والوحدات والعقود.
 * مُستخرج من usePropertiesViewPage لإبقائه ≤200 سطر (المرحلة 1.3).
 */
import { useMemo } from 'react';

interface ContractLike { id?: string | null; property_id?: string | null; unit_id?: string | null; status?: string | null }
interface UnitLike { id: string; property_id: string }

export function usePropertiesAggregateMaps<C extends ContractLike, U extends UnitLike>(
  contracts: C[] | undefined,
  units: U[] | undefined,
  isSpecificYear: boolean,
) {

  const propertyContractsMap = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of (contracts ?? [])) {
      if (!c.property_id) continue;
      const arr = map.get(c.property_id);
      if (arr) arr.push(c); else map.set(c.property_id, [c]);
    }
    return map;
  }, [contracts]);

  const propertyUnitsMap = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of (units ?? [])) {
      const arr = map.get(u.property_id);
      if (arr) arr.push(u); else map.set(u.property_id, [u]);
    }
    return map;
  }, [units]);

  const wholePropertyRentedSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of (contracts ?? [])) {
      if (!(isSpecificYear || c.status === 'active')) continue;
      if (c.property_id && !c.unit_id) s.add(c.property_id);
    }
    return s;
  }, [contracts, isSpecificYear]);

  const rentedUnitIdsByPropertyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [pid, pcontracts] of propertyContractsMap.entries()) {
      const set = new Set<string>();
      for (const c of pcontracts) if (c.unit_id) set.add(c.unit_id);
      map.set(pid, set);
    }
    return map;
  }, [propertyContractsMap]);

  return { propertyContractsMap, propertyUnitsMap, wholePropertyRentedSet, rentedUnitIdsByPropertyMap };
}
