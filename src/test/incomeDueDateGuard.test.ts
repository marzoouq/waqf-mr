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
    // الدالة قد تُغلَّف وتُعاد تسمية جسمها؛ نتتبع آخر تعريف يُدرج الدخل فعلاً
    for (const m of sql.matchAll(/FUNCTION public\.pay_invoice_(?:remaining_)?and_record_collection\(/g)) {
      const body = sql.slice(m.index ?? 0);
      const end = body.indexOf('$$;');
      const chunk = end > 0 ? body.slice(0, end) : body;
      if (/INSERT INTO (public\.)?income/.test(chunk)) def = chunk;
    }
  }
  return def;
}

describe('pay_invoice_and_record_collection income date', () => {
  const def = latestDefinition();
  it('is redefined in a drizzle migration', () => {
    expect(def).not.toBe('');
  });
  it('records income on the invoice due date', () => {
    expect(def).toMatch(/v_invoice\.due_date/);
    expect(def).not.toMatch(/\bCURRENT_DATE\b/);
  });
});
