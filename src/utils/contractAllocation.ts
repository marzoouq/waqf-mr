/**
 * Contract Fiscal Allocation Utility
 * 
 * Distributes contract payments across fiscal years based on payment due dates.
 * Each payment is assigned to the fiscal year in which its due date falls.
 */

import type { FiscalYear } from '@/types/database';

interface ContractInfo {
  id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_type?: string;
  payment_count?: number;
  payment_amount?: number;
}

export interface FiscalAllocation {
  contract_id: string;
  fiscal_year_id: string;
  period_start: string; // ISO date
  period_end: string;   // ISO date
  allocated_payments: number;
  allocated_amount: number;
}

/**
 * Generate payment due dates for a contract.
 * Returns an array of ISO date strings representing each payment's due date.
 */
export function generatePaymentDueDates(contract: ContractInfo): string[] {
  const start = new Date(contract.start_date);
  const paymentCount = getPaymentCount(contract);
  const dates: string[] = [];

  if (paymentCount === 1) {
    // L-01 fix: single payment (any type with 1 due date) — due at start + 1 month grace
    const due = new Date(start);
    due.setMonth(due.getMonth() + 1);
    dates.push(toISODate(due));
  } else {
    // Monthly or multi: payments due each period after start
    for (let i = 0; i < paymentCount; i++) {
      const due = new Date(start);
      if (contract.payment_type === 'monthly') {
        due.setMonth(due.getMonth() + i + 1);
      } else if (contract.payment_type === 'quarterly') {
        due.setMonth(due.getMonth() + (i + 1) * 3);
      } else if (contract.payment_type === 'semi_annual' || contract.payment_type === 'semi-annual') {
        due.setMonth(due.getMonth() + (i + 1) * 6);
      } else {
        // Multi-payment: evenly spaced
        const totalDays = daysBetween(start, new Date(contract.end_date));
        const interval = totalDays / paymentCount;
        due.setDate(due.getDate() + Math.round(interval * (i + 1)));
      }
      dates.push(toISODate(due));
    }
  }

  return dates;
}

/**
 * Allocate a contract's payments to the fiscal years they fall within.
 * Returns one allocation per fiscal year that has at least one payment.
 */
export function allocateContractToFiscalYears(
  contract: ContractInfo,
  fiscalYears: FiscalYear[]
): FiscalAllocation[] {
  const dueDates = generatePaymentDueDates(contract);
  const paymentAmount = getPaymentAmount(contract);
  const sortedFYs = [...fiscalYears].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Map each due date to a fiscal year
  const fyPaymentCounts = new Map<string, { count: number; minDate: string; maxDate: string }>();

  for (const dateStr of dueDates) {
    const date = new Date(dateStr);
    const fy = findFiscalYearForDate(date, sortedFYs);
    if (!fy) continue; // Payment falls outside all fiscal years

    const existing = fyPaymentCounts.get(fy.id);
    if (existing) {
      existing.count++;
      if (dateStr < existing.minDate) existing.minDate = dateStr;
      if (dateStr > existing.maxDate) existing.maxDate = dateStr;
    } else {
      fyPaymentCounts.set(fy.id, { count: 1, minDate: dateStr, maxDate: dateStr });
    }
  }

  const allocations: FiscalAllocation[] = [];
  for (const [fyId, info] of fyPaymentCounts) {
    allocations.push({
      contract_id: contract.id,
      fiscal_year_id: fyId,
      period_start: info.minDate,
      period_end: info.maxDate,
      allocated_payments: info.count,
      allocated_amount: Math.round(paymentAmount * info.count * 100) / 100,
    });
  }

  return allocations;
}

/**
 * Find which fiscal year a given date falls into.
 * A date falls in a FY if: fy.start_date <= date < fy.end_date (or <= for last day)
 */
function findFiscalYearForDate(date: Date, sortedFYs: FiscalYear[]): FiscalYear | null {
  for (let i = 0; i < sortedFYs.length; i++) {
    const fy = sortedFYs[i];
    const fyStart = new Date(fy.start_date);
    const fyEnd = new Date(fy.end_date);
    // بداية شاملة، نهاية حصرية — إلا لآخر سنة مالية (شاملة)
    const isLast = i === sortedFYs.length - 1;
    if (date >= fyStart && (isLast ? date <= fyEnd : date < fyEnd)) {
      return fy;
    }
  }
  return null;
}

function getPaymentCount(contract: ContractInfo): number {
  const months = monthsBetween(new Date(contract.start_date), new Date(contract.end_date));
  if (contract.payment_type === 'monthly') return Math.max(1, months);
  if (contract.payment_type === 'quarterly') return Math.max(1, Math.ceil(months / 3));
  if (contract.payment_type === 'semi_annual' || contract.payment_type === 'semi-annual') return Math.max(1, Math.ceil(months / 6));
  if (contract.payment_type === 'annual') return Math.max(1, Math.ceil(months / 12));
  return contract.payment_count || 1;
}

/** Calculate whole months between two dates */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function getPaymentAmount(contract: ContractInfo): number {
  if (contract.payment_amount != null) return Number(contract.payment_amount); // L-08 fix: respect 0
  const count = getPaymentCount(contract);
  return Number(contract.rent_amount) / count;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Check if a contract spans multiple fiscal years.
 * Returns the allocations if it does (length > 1), or a single allocation if it doesn't.
 */
export function getContractSpanInfo(
  contract: ContractInfo,
  fiscalYears: FiscalYear[]
): { spansMultiple: boolean; allocations: FiscalAllocation[] } {
  const allocations = allocateContractToFiscalYears(contract, fiscalYears);
  return {
    spansMultiple: allocations.length > 1,
    allocations,
  };
}
