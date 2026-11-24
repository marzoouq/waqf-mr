/**
 * حارس الحساب البنكي للوقف: مخفي افتراضياً عن المستفيدين، التعديل للناظر فقط،
 * الكشف عبر can_access_file وبإذن الناظر، ورصد رقبة الوقف عند الإقفال لا يمس بيانات السنة.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('drizzle/migrations/0033_waqf_bank_account.sql', 'utf8');
const policy = (name: string) => new RegExp(`CREATE POLICY ${name}[\\s\\S]*?;`).exec(sql)?.[0] ?? '';

describe('الحساب البنكي للوقف', () => {
  it('القسم والكشف مخفيان افتراضياً', () => {
    expect(sql).toMatch(/visible_to_beneficiaries boolean NOT NULL DEFAULT false/);
    expect(sql).toMatch(/statement_visible_to_beneficiaries boolean NOT NULL DEFAULT false/);
    expect(sql).toMatch(/COALESCE\(\(SELECT a\.visible_to_beneficiaries[\s\S]{0,60}\), false\)/);
  });
  it('المستفيد يقرأ فقط بإذن الناظر، والمحاسب دائماً', () => {
    const p = policy('bank_account_select');
    expect(p).toContain("'accountant'::app_role");
    expect(p).toContain('bank_section_visible(auth.uid())');
  });
  it('الكتابة للناظر وحده', () => {
    for (const n of ['bank_account_admin_insert', 'bank_account_admin_update', 'bank_statements_admin_insert',
      'bank_statements_admin_update', 'bank_statements_admin_delete']) {
      const p = policy(n);
      expect(p).toContain("has_role(auth.uid(), 'admin'::app_role)");
      expect(p).not.toContain('accountant');
    }
    expect(sql).not.toMatch(/ON public\.waqf_bank_balance_log FOR (INSERT|UPDATE|DELETE)/);
  });
  it('المستفيد لا يرى إلا الكشف الحالي وبإذن الكشف', () => {
    expect(policy('bank_statements_select')).toMatch(/is_current AND public\.bank_statement_visible\(auth\.uid\(\)\)/);
  });
  it('ملف الكشف يمر عبر can_access_file بإذن الكشف والكشف الحالي فقط', () => {
    expect(sql).toMatch(/_bucket = 'waqf-bank-statements' THEN[\s\S]{0,200}bank_statement_visible\(_user_id\)[\s\S]{0,160}s\.is_current/);
    expect(sql).toMatch(/\('waqf-bank-statements','accountant', true, true, false, false\)/);
  });
  it('رصد رقبة الوقف عند الإقفال يكتب في الحساب البنكي فقط ولا يوقف الإقفال', () => {
    const fn = /record_corpus_in_bank_on_close\(\)[\s\S]*?END \$\$;/.exec(sql)?.[0] ?? '';
    expect(fn).toContain('waqf_corpus_manual');
    expect(fn).toContain('EXCEPTION WHEN OTHERS');
    expect(fn).not.toMatch(/UPDATE public\.(accounts|fiscal_years|distributions)/);
    expect(fn).toMatch(/INSERT INTO public\.waqf_bank_account/);
  });
  it('إذن الملف الفردي لا يتجاوز إخفاء الناظر للكشف (أحدث تعريف لـ can_access_file)', () => {
    const latest = readFileSync('drizzle/migrations/0034_bank_statement_grants_cannot_bypass_visibility.sql', 'utf8');
    const gate = latest.indexOf("NOT public.bank_statement_visible(_user_id) THEN");
    const grants = latest.indexOf('FROM public.file_access_grants');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(grants);
    expect(latest).toMatch(/g = 'allow' AND _action IN \('read','download'\) AND _bucket <> 'waqf-bank-statements'/);
  });
});
