/**
 * حساب أداء العقارات — hook مشترك لصفحة التقارير وأي صفحة أخرى
 * يعتمد على computePropertyFinancials الموجود مسبقاً
 */
import { useMemo } from 'react';
import { computePropertyFinancials } from '@/hooks/computed/usePropertyFinancials';

interface Property {
  id: string;
  property_number: string;
  property_type: string;
}

interface Contract {
  id?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  status?: string | null;
  rent_amount?: number | null;
  payment_type?: string | null;
  payment_amount?: number | null;
}

interface Expense {
  id?: string | null;
  property_id?: string | null;
  amount?: number | null;
}

interface Unit {
  id?: string | null;
  property_id?: string | null;
  status?: string | null;
}

export interface PropertyPerformanceItem {
  id: string;
  name: string;
  type: string;
  totalUnits: number;
  occupancy: number;
  annualRent: number;
  totalExpenses: number;
  netIncome: number;
}

export interface PropertyPerformanceTotals {
  totalUnits: number;
  annualRent: number;
  totalExpenses: number;
  netIncome: number;
}

export function usePropertyPerformance(
  properties: Property[],
  contracts: Contract[],
  expenses: Expense[],
  allUnits: Unit[],
  isSpecificYear: boolean,
  allocationMap?: Map<string, { allocated_amount: number }>,
) {
  const propertyPerformance = useMemo(() =>
    properties.map((property) => {
      const fin = computePropertyFinancials({
        propertyId: property.id,
        contracts,
        expenses,
        units: allUnits,
        isSpecificYear,
        allocationMap,
      });

      return {
        id: property.id,
        name: property.property_number,
        type: property.property_type,
        totalUnits: fin.totalUnits,
        occupancy: fin.occupancy,
        annualRent: fin.activeAnnualRent,
        totalExpenses: fin.totalExpenses,
        netIncome: fin.activeAnnualRent - fin.totalExpenses,
      };
    }).sort((a, b) => b.netIncome - a.netIncome),
    [properties, contracts, expenses, allUnits, isSpecificYear, allocationMap]
  );

  const perfTotals = useMemo(() =>
    propertyPerformance.reduce(
      (acc, p) => ({
        totalUnits: acc.totalUnits + p.totalUnits,
        annualRent: acc.annualRent + p.annualRent,
        totalExpenses: acc.totalExpenses + p.totalExpenses,
        netIncome: acc.netIncome + p.netIncome,
      }),
      { totalUnits: 0, annualRent: 0, totalExpenses: 0, netIncome: 0 }
    ),
    [propertyPerformance]
  );

  return { propertyPerformance, perfTotals };
}
