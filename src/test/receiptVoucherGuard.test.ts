/**
 * حارس سند القبض: رقم فريد، سند واحد ساري لكل فاتورة، إلغاء للناظر فقط بسبب، تحقق عام بلا بيانات شخصية.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'drizzle/migrations');
const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');

describe('سند القبض', () => {
  it('رقم السند فريد بصيغة RCV-YYYY-000001', () => {
    expect(sql).toMatch(/receipt_number text NOT NULL UNIQUE/);
    expect(sql).toMatch(/'RCV-' \|\| to_char\([\s\S]{0,80}lpad\(nextval\('public\.receipt_voucher_seq'\)::text, 6, '0'\)/);
  });
  it('سند واحد ساري فقط لكل فاتورة', () => {
    expect(sql).toMatch(/UNIQUE INDEX receipt_vouchers_one_issued_per_invoice[\s\S]{0,80}WHERE status = 'issued'/);
  });
  it('التراجع عن السداد يلغي السند ولا يحذفه', () => {
    expect(sql).toMatch(/OLD\.status = 'paid' AND NEW\.status IS DISTINCT FROM 'paid'[\s\S]{0,60}UPDATE receipt_vouchers SET status = 'void'/);
    expect(sql).not.toMatch(/DELETE FROM (public\.)?receipt_vouchers/);
  });
  it('الإلغاء اليدوي للناظر فقط ويتطلب سبباً', () => {
    expect(sql).toMatch(/void_receipt_voucher[\s\S]{0,300}has_role\(auth\.uid\(\), 'admin'\)[\s\S]{0,120}سبب الإلغاء مطلوب/);
  });
  it('التحقق العام لا يكشف المستأجر', () => {
    const fn = /verify_receipt_voucher\(p_code text\)[\s\S]*?\$\$;/.exec(sql)?.[0] ?? '';
    expect(fn).toContain('RETURNS TABLE(receipt_number text, paid_date date, amount numeric, status text)');
    expect(fn).not.toMatch(/tenant|contract_id|national/);
  });
  it('قراءة الجدول للناظر والمحاسب فقط', () => {
    expect(sql).toMatch(/CREATE POLICY "Staff read receipts"[\s\S]{0,200}'admin'::app_role\)[\s\S]{0,60}'accountant'::app_role\)/);
  });
});
