/**
 * تصنيف منشأ العقد حسب السنة المالية الحالية.
 * - inYear:        contract.start_date >= fiscalYear.start_date
 * - fromPrevious:  contract.start_date <  fiscalYear.start_date
 * - unknown:       لا توجد سنة مالية مرجعية (وضع "كل السنوات")
 */
export type ContractOriginClass = 'inYear' | 'fromPrevious' | 'unknown';

export function classifyContractOrigin(
  contractStartDate: string,
  fiscalYearStartDate: string | null,
): ContractOriginClass {
  if (!fiscalYearStartDate) return 'unknown';
  return contractStartDate < fiscalYearStartDate ? 'fromPrevious' : 'inYear';
}
