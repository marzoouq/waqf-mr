import { describe, it, expect } from 'vitest';
import { findAccountByFY } from '@/utils/findAccountByFY';

const makeAcct = (fiscal_year: string, fiscal_year_id?: string | null) => ({
  fiscal_year,
  fiscal_year_id: fiscal_year_id ?? undefined,
});

describe('findAccountByFY', () => {
  it('returns account matching by UUID', () => {
    const accts = [
      makeAcct('2023-2024', 'uuid-a'),
      makeAcct('2024-2025', 'uuid-b'),
    ];
    const result = findAccountByFY(accts, { id: 'uuid-b', label: '2024-2025' });
    expect(result).toBe(accts[1]);
  });

  it('UUID match is checked before label on the same record', () => {
    // The function uses find() with (UUID match OR label match),
    // so ordering matters. When UUID-match record comes first, it wins.
    const accts = [
      makeAcct('2023-2024', 'uuid-b'),   // UUID matches → found first
      makeAcct('2024-2025', 'uuid-a'),   // label matches but not reached
    ];
    const result = findAccountByFY(accts, { id: 'uuid-b', label: '2024-2025' });
    expect(result).toBe(accts[0]);
  });

  it('falls back to label when UUID not found', () => {
    const accts = [
      makeAcct('2023-2024', 'uuid-a'),
      makeAcct('2024-2025', 'uuid-c'),
    ];
    const result = findAccountByFY(accts, { id: 'uuid-missing', label: '2024-2025' });
    expect(result).toBe(accts[1]);
  });

  it('returns null when neither UUID nor label matches', () => {
    const accts = [makeAcct('2023-2024', 'uuid-a')];
    const result = findAccountByFY(accts, { id: 'uuid-missing', label: 'no-match' });
    expect(result).toBeNull();
  });

  it('returns the only account when fy is null and single account', () => {
    const accts = [makeAcct('2023-2024', 'uuid-a')];
    const result = findAccountByFY(accts, null);
    expect(result).toBe(accts[0]);
  });

  it('returns null when fy is null and multiple accounts', () => {
    const accts = [makeAcct('2023-2024', 'uuid-a'), makeAcct('2024-2025', 'uuid-b')];
    const result = findAccountByFY(accts, null);
    expect(result).toBeNull();
  });

  it('matches legacy account without fiscal_year_id via label fallback', () => {
    const accts = [
      makeAcct('2022-2023'),          // legacy: no fiscal_year_id
      makeAcct('2023-2024', 'uuid-a'),
    ];
    const result = findAccountByFY(accts, { id: 'uuid-missing', label: '2022-2023' });
    expect(result).toBe(accts[0]);
  });
});
