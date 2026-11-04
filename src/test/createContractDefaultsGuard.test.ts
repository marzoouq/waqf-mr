/**
 * حارس: دالة create_contract_with_invoices يجب أن تملأ القيم الافتراضية
 * (id/status/created_at/updated_at/payment_type/payment_count) قبل
 * jsonb_populate_record، لأنه يحوّل المفاتيح الغائبة إلى NULL فيكسر NOT NULL.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'drizzle/migrations');

function latestDefinition(): string {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let def = '';
  for (const f of files) {
    const sql = readFileSync(join(dir, f), 'utf8');
    const idx = sql.lastIndexOf('FUNCTION public.create_contract_with_invoices');
    if (idx >= 0) def = sql.slice(idx);
  }
  return def;
}

describe('create_contract_with_invoices defaults', () => {
  const def = latestDefinition();
  it('is redefined in a drizzle migration', () => {
    expect(def).not.toBe('');
  });
  it.each(['id', 'status', 'created_at', 'updated_at', 'payment_type', 'payment_count'])(
    'fills default for %s before populate',
    (col) => {
      expect(def).toMatch(new RegExp(`'${col}'\\s*,`));
      expect(def).toMatch(/\|\|\s*p_contract/);
    },
  );
});
