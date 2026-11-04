import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateEjarFile, ejarDatesMismatch, ejarErrorMessage } from '@/utils/contracts/ejarDocument';

const audit = readFileSync('drizzle/migrations/0021_audit_coverage_admin_tables.sql', 'utf8');
const ejar = readFileSync('drizzle/migrations/0022_contract_ejar_documents.sql', 'utf8');

describe('سجل المراجعة يشمل تعديلات الناظر الإدارية', () => {
  for (const t of ['user_roles', 'file_access_rules', 'file_access_grants', 'file_category_rules', 'account_categories',
    'expense_budgets', 'annual_report_items', 'tenant_payments', 'official_letters', 'zatca_certificates', 'blocked_ips']) {
    it(`الجدول ${t} مسجَّل`, () => expect(audit).toContain(`'${t}'`));
  }
  it('أسرار ZATCA مقنّعة في السجل', () => expect(audit).toMatch(/zatca_certificates'[\s\S]*private_key/));
});

describe('عقد إيجار الموثق', () => {
  it('المستفيد لا يقرأ إلا بإذن عبر can_access_file', () => {
    expect(ejar).toMatch(/fac_select_contract_docs[\s\S]*can_access_file\(auth\.uid\(\), bucket_id, name, 'read'\)/);
    expect(ejar).not.toMatch(/contract-documents'[^;]*TO anon/);
  });
  it('الحذف للناظر فقط', () => {
    expect(ejar).toMatch(/admin_delete_contract_documents[\s\S]*FOR DELETE[\s\S]*has_role\(auth\.uid\(\), 'admin'::app_role\)\);/);
  });
  it('يُمنع حذف عقد له ملف موثق', () => expect(ejar).toContain('prevent_contract_delete_with_ejar'));
  it('التنزيل يُسجَّل قبل الرابط', () => expect(ejar).toMatch(/log_contract_document_download[\s\S]*'DOWNLOAD'/));
  it('يقبل PDF/JPG/PNG حتى 10MB فقط', () => {
    expect(validateEjarFile({ type: 'application/pdf', size: 1000 })).toBeNull();
    expect(validateEjarFile({ type: 'image/gif', size: 1000 })).not.toBeNull();
    expect(validateEjarFile({ type: 'image/png', size: 11 * 1024 * 1024 })).not.toBeNull();
  });
  it('ينبّه عند اختلاف التواريخ', () => {
    expect(ejarDatesMismatch({ ejar_start_date: '2026-01-01', ejar_end_date: null }, { start_date: '2026-01-02', end_date: 'x' })).toBe(true);
    expect(ejarDatesMismatch({ ejar_start_date: null, ejar_end_date: null }, { start_date: 'a', end_date: 'b' })).toBe(false);
  });
  it('رقم إيجار مكرر برسالة عربية', () => {
    expect(ejarErrorMessage(new Error('duplicate key "contract_documents_ejar_number_current"'))).toBe('رقم عقد إيجار مستخدم في عقد آخر');
  });
});
