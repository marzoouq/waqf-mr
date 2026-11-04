/**
 * حارس: قيد الدخل الناتج عن سداد فاتورة يُؤرَّخ بتاريخ استحقاق الدفعة
 * (due_date) لا بتاريخ اليوم، حتى يظهر كل قسط في شهره بجدول المقارنة.
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
    const idx = sql.lastIndexOf('FUNCTION public.pay_invoice_and_record_collection');
    if (idx >= 0) def = sql.slice(idx);
  }
  return def;
}

describe('pay_invoice_and_record_collection income date', () => {
  const def = latestDefinition();
  it('is redefined in a drizzle migration', () => {
    expect(def).not.toBe('');
  });
  it('records income on the invoice due date', () => {
    const insert = def.slice(def.indexOf('INSERT INTO income'));
    expect(insert).toMatch(/v_invoice\.due_date/);
    expect(insert.slice(0, 400)).not.toMatch(/CURRENT_DATE/);
  });
});
