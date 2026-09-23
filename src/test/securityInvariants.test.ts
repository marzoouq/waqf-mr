/**
 * ثوابت أمنية ثابتة (static invariants) — تفشل عند أي انحدار مستقبلي.
 * تُغلق البنود: مصدر الأدوار، تحقق المدخلات في دوال الحافة، وسياسات قراءة التخزين.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'src');
const FUNCTIONS = join(process.cwd(), 'supabase', 'functions');
const MIGRATIONS = join(process.cwd(), 'drizzle', 'migrations');

function walk(dir: string, filter: (p: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full, filter);
    return filter(full) ? [full] : [];
  });
}

describe('مصدر الأدوار', () => {
  it('لا يُقرأ أي دور من localStorage أو sessionStorage', () => {
    const files = walk(SRC, (p) => /\.tsx?$/.test(p) && !/\.test\./.test(p));
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return /(local|session)Storage\.getItem\(\s*['"`][^'"`]*(role|admin|permission)/i.test(src);
    });
    expect(offenders).toEqual([]);
  });

  it('جلب الدور يتم من جدول user_roles فقط', () => {
    const src = readFileSync(join(SRC, 'lib/auth/fetchUserRole.ts'), 'utf8');
    expect(src).toContain("from('user_roles')");
    expect(src).not.toMatch(/(local|session)Storage/);
  });
});

describe('تحقق المدخلات في دوال الحافة', () => {
  it('كل دالة تقرأ body تستخدم تحقق مخطط (safeParse)', () => {
    const dirs = readdirSync(FUNCTIONS).filter(
      (d) => d !== '_shared' && statSync(join(FUNCTIONS, d)).isDirectory(),
    );
    const missing = dirs.filter((d) => {
      const files = walk(join(FUNCTIONS, d), (p) => /\.ts$/.test(p) && !/\.test\./.test(p));
      const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
      if (!/req\.json\(\)/.test(all)) return false;
      return !/safeParse|zod/.test(all);
    });
    expect(missing).toEqual([]);
  });
});

describe('سياسات قراءة ملفات الفواتير', () => {
  it('توجد هجرة تُسقط كل سياسات القراءة على حزمة invoices', () => {
    const sql = walk(MIGRATIONS, (p) => p.endsWith('.sql'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Authenticated users can view invoices"/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Role-based users can view invoices"/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Beneficiaries and waqif can view invoice files"/);
  });

  it('لا تُنشئ أي هجرة سياسة SELECT جديدة على حزمة invoices', () => {
    const offenders = walk(MIGRATIONS, (p) => p.endsWith('.sql')).filter((f) => {
      const sql = readFileSync(f, 'utf8');
      return /CREATE POLICY[\s\S]{0,400}?FOR SELECT[\s\S]{0,400}?bucket_id\s*=\s*'invoices'/i.test(sql);
    });
    expect(offenders).toEqual([]);
  });
});
