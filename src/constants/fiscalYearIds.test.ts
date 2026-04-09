import { describe, it, expect } from 'vitest';
import {
  FY_NONE, FY_ALL, FY_SKIP,
  isFyReady, isFyAll, isFySpecific,
} from '@/constants/fiscalYearIds';

describe('isFyReady', () => {
  it('false لـ FY_NONE', () => expect(isFyReady(FY_NONE)).toBe(false));
  it('false لـ FY_SKIP', () => expect(isFyReady(FY_SKIP)).toBe(false));
  it('false لـ undefined', () => expect(isFyReady(undefined)).toBe(false));
  it('false لسلسلة فارغة', () => expect(isFyReady('')).toBe(false));
  it('true لـ FY_ALL', () => expect(isFyReady(FY_ALL)).toBe(true));
  it('true لـ UUID', () => expect(isFyReady('some-uuid-123')).toBe(true));
});

describe('isFyAll', () => {
  it('true لـ FY_ALL', () => expect(isFyAll(FY_ALL)).toBe(true));
  it('false لـ FY_NONE', () => expect(isFyAll(FY_NONE)).toBe(false));
  it('false لـ UUID', () => expect(isFyAll('some-uuid')).toBe(false));
  it('false لـ undefined', () => expect(isFyAll(undefined)).toBe(false));
});

describe('isFySpecific', () => {
  it('true لـ UUID', () => expect(isFySpecific('some-uuid')).toBe(true));
  it('false لـ FY_ALL', () => expect(isFySpecific(FY_ALL)).toBe(false));
  it('false لـ FY_NONE', () => expect(isFySpecific(FY_NONE)).toBe(false));
  it('false لـ FY_SKIP', () => expect(isFySpecific(FY_SKIP)).toBe(false));
  it('false لـ undefined', () => expect(isFySpecific(undefined)).toBe(false));
});
