import { describe, it, expect } from 'vitest';
import { resolveFiscalYearId } from './resolveFiscalYearId';
import { FY_NONE, FY_ALL } from '@/constants/fiscalYearIds';

describe('resolveFiscalYearId', () => {
  const base = {
    isLoading: false,
    authLoading: false,
    noPublishedYears: false,
    selectedId: '',
    activeFyId: undefined,
    isNonAdmin: false,
    firstYearId: undefined,
  };

  it('returns FY_NONE while loading data', () => {
    expect(resolveFiscalYearId({ ...base, isLoading: true })).toBe(FY_NONE);
  });

  it('returns FY_NONE while auth is loading', () => {
    expect(resolveFiscalYearId({ ...base, authLoading: true })).toBe(FY_NONE);
  });

  it('returns FY_NONE for non-admin with no published years', () => {
    expect(resolveFiscalYearId({ ...base, noPublishedYears: true, isNonAdmin: true })).toBe(FY_NONE);
  });

  it('returns selectedId when explicitly chosen', () => {
    const selectedId = 'b3c8e1a2-1234-5678-9abc-def012345678';
    expect(resolveFiscalYearId({ ...base, selectedId, activeFyId: 'other' })).toBe(selectedId);
  });

  it('falls back to active fiscal year when no selection', () => {
    expect(resolveFiscalYearId({ ...base, activeFyId: 'fy-active' })).toBe('fy-active');
  });

  it('returns first year for non-admin without active year', () => {
    expect(resolveFiscalYearId({ ...base, isNonAdmin: true, firstYearId: 'fy-first' })).toBe('fy-first');
  });

  it('returns FY_NONE for non-admin without any fallback year', () => {
    expect(resolveFiscalYearId({ ...base, isNonAdmin: true })).toBe(FY_NONE);
  });

  it('returns FY_ALL for admin/accountant without selection or active year', () => {
    expect(resolveFiscalYearId({ ...base, isNonAdmin: false })).toBe(FY_ALL);
  });

  it('prioritizes selection over active year', () => {
    expect(resolveFiscalYearId({
      ...base, selectedId: 'manual', activeFyId: 'auto', isNonAdmin: true,
    })).toBe('manual');
  });
});
