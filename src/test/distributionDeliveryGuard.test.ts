import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('drizzle/migrations/0026_confirm_distribution_delivery.sql', 'utf8');

describe('distribution delivery guard', () => {
  it('closed year allows only pending -> paid, never amount changes', () => {
    expect(sql).toMatch(/NEW\.amount IS DISTINCT FROM OLD\.amount/);
    expect(sql).toMatch(/NOT \(OLD\.status = 'pending' AND NEW\.status = 'paid'\)/);
  });
  it('confirmation is admin-only', () => {
    expect(sql).toMatch(/NOT has_role\(auth\.uid\(\), 'admin'::app_role\)/);
  });
  it('anon cannot execute', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.confirm_distribution_delivery[^;]+FROM PUBLIC, anon/);
  });
});
