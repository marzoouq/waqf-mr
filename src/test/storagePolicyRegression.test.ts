/**
 * اختبار انحدار: لا تعود سياسة قراءة واسعة على ملفات الفواتير
 * -----------------------------------------------------------
 * التنزيل يمرّ حصراً عبر Edge Function `invoice-file-url` التي تتحقق
 * خادمياً من الدور والسنة المالية. أي سياسة SELECT على حزمة `invoices`
 * في storage.objects تعني تجاوز تلك البوابة.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

/** آخر إجراء (إنشاء/إسقاط) لكل سياسة SELECT تخصّ حزمة الفواتير */
function lastActionPerInvoiceSelectPolicy(): Map<string, 'create' | 'drop'> {
  const state = new Map<string, 'create' | 'drop'>();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    for (const match of sql.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+storage\.objects/gi)) {
      if (match[1]) state.set(match[1], 'drop');
    }

    for (const match of sql.matchAll(
      /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+storage\.objects([\s\S]*?);/gi,
    )) {
      const name = match[1];
      const body = match[2] ?? '';
      const isSelect = /FOR\s+SELECT/i.test(body);
      const touchesInvoices = /'invoices'/.test(body);
      if (name && isSelect && touchesInvoices) state.set(name, 'create');
    }
  }

  return state;
}

describe('انحدار سياسات تخزين الفواتير', () => {
  it('لا توجد سياسة قراءة نشطة على حزمة الفواتير في تاريخ الهجرات', () => {
    const active = [...lastActionPerInvoiceSelectPolicy().entries()]
      .filter(([, action]) => action === 'create')
      .map(([name]) => name);

    expect(active).toEqual([]);
  });

  it('السياسات الواسعة المعروفة مُسقَطة صراحةً', () => {
    const all = files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8')).join('\n');
    for (const legacy of [
      'Authenticated users can view invoices',
      'Role-based users can view invoices',
    ]) {
      expect(all).toContain(`DROP POLICY IF EXISTS "${legacy}" ON storage.objects`);
    }
  });

  it('بوابة التنزيل الخادمية موجودة', () => {
    const fn = readFileSync(
      join(process.cwd(), 'supabase', 'functions', 'invoice-file-url', 'index.ts'),
      'utf8',
    );
    expect(fn).toMatch(/authenticate\(/);
    const shared = readFileSync(
      join(process.cwd(), 'supabase', 'functions', '_shared', 'auth.ts'),
      'utf8',
    );
    expect(shared).toMatch(/getUser\(/);
    expect(fn).toMatch(/createSignedUrl/);
  });
});
