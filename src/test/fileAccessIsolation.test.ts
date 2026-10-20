/**
 * حارس العزل الكامل للملفات — كل سياسة نشطة على storage.objects
 * يجب أن تمر عبر قرار الناظر المركزي `can_access_file`، ولا قراءة مباشرة للفواتير.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dirs = [join(process.cwd(), 'supabase', 'migrations'), join(process.cwd(), 'drizzle', 'migrations')];
const sqls = dirs.flatMap((d) =>
  readdirSync(d).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(d, f), 'utf8')),
);

function activePolicies(): Map<string, string> {
  const state = new Map<string, string>();
  for (const sql of sqls) {
    const re = /(DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"([^"]+)"\s+ON\s+storage\.objects)|(CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+storage\.objects([\s\S]*?);)/gi;
    for (const m of sql.matchAll(re)) {
      if (m[2]) state.delete(m[2]);
      else if (m[4]) state.set(m[4], m[5] ?? '');
    }
  }
  return state;
}

describe('عزل الملفات بقرار الناظر', () => {
  it('كل سياسة نشطة تمر عبر can_access_file', () => {
    const bypass = [...activePolicies().entries()].filter(([, b]) => !/can_access_file\(/.test(b)).map(([n]) => n);
    expect(bypass).toEqual([]);
  });

  it('لا سياسة قراءة على حزمة الفواتير', () => {
    const reads = [...activePolicies().entries()].filter(([, b]) => /FOR\s+SELECT/i.test(b) && /'invoices'/.test(b));
    expect(reads).toEqual([]);
  });

  it('بوابة الفواتير تستشير قرار الناظر', () => {
    const fn = readFileSync(join(process.cwd(), 'supabase', 'functions', 'invoice-file-url', 'index.ts'), 'utf8');
    expect(fn).toMatch(/can_access_file/);
  });
});

describe('قرار الناظر: الأذونات الفردية وقواعد الفئات', () => {
  const all = sqls.join('\n');
  const last = all.slice(all.lastIndexOf('CREATE OR REPLACE FUNCTION public.can_access_file'));
  it('الحجب الفردي يُفحص قبل أي سماح', () => {
    expect(last.indexOf("g = 'deny'")).toBeGreaterThan(0);
    expect(last.indexOf("g = 'deny'")).toBeLessThan(last.indexOf("g = 'allow'"));
  });
  it('الإذن المنتهي لا يُحتسب', () => {
    expect(last).toMatch(/expires_at IS NULL OR expires_at > now\(\)/);
  });
  it('قاعدة فئة الأرشيف تُقدَّم على قاعدة الحاوية', () => {
    expect(last.indexOf('file_category_rules')).toBeGreaterThan(0);
    expect(last.indexOf('file_category_rules')).toBeLessThan(last.indexOf('FROM public.file_access_rules'));
  });
  it('فئات المستفيد والواقف تبدأ محجوبة', () => {
    expect(all).toMatch(/AND r\.role = 'accountant'/);
  });
});
