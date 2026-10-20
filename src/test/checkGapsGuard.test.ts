/**
 * حارس فجوات Check: إنشاء التذاكر بحالة مفتوحة فقط، ورفض المبالغ السالبة في الإيرادات والمصروفات.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dirs = ['drizzle/migrations', 'supabase/migrations'].map((d) => join(process.cwd(), d));
const sql = dirs
  .filter(existsSync)
  .flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(join(d, f), 'utf8')))
  .join('\n');

describe('فجوات Check', () => {
  it('إنشاء التذكرة يفرض الحالة المفتوحة وبلا مسؤول', () => {
    expect(sql).toMatch(/CREATE POLICY "Users can create tickets"[\s\S]{0,300}status = 'open'[\s\S]{0,100}assigned_to IS NULL/);
  });
  it('حارس التذاكر يمنع حقول الحل والتقييم عند الإنشاء', () => {
    expect(sql).toMatch(/TG_OP = 'INSERT'[\s\S]{0,400}resolved_at IS NOT NULL[\s\S]{0,200}rating IS NOT NULL/);
  });
  it('المبالغ السالبة مرفوضة في الإيرادات والمصروفات', () => {
    expect(sql).toMatch(/income_amount_non_negative CHECK \(amount >= 0\)/);
    expect(sql).toMatch(/expenses_amount_non_negative CHECK \(amount >= 0\)/);
  });
});
