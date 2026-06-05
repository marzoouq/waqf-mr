/**
 * حارس الفحوصات الحرجة — يمنع رجوع أي انتهاك حرج لقواعد التنظيم.
 * يُشغّل سكربتات الـ audit ثم يفحص مخرجاتها + يفحص مباشرة استيرادات الصفحات/الهوكات/utils.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');

function run(script: string) {
  execFileSync('node', [`scripts/${script}`], { cwd: ROOT, stdio: 'pipe' });
}

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(e) && !/\.test\.(ts|tsx)$/.test(e)) yield p;
  }
}

const SRC = path.join(ROOT, 'src');

describe('Audit critical gate', () => {
  beforeAll(() => {
    run('audit-conventions-deep.mjs');
    run('audit-hooks-layout.mjs');
    run('audit-ui-permissions.mjs');
    run('audit-page-controls.mjs');
  });

  it('conventions-deep-violations.csv has 0 Critical rows', () => {
    const csv = readFileSync(path.join(ROOT, 'audit/conventions-deep-violations.csv'), 'utf8');
    const criticals = csv.split('\n').filter(l => l.startsWith('Critical,'));
    expect(criticals, criticals.join('\n')).toEqual([]);
  });

  it('hooks-layout-report.md has no Critical issues', () => {
    const md = readFileSync(path.join(ROOT, 'audit/hooks-layout-report.md'), 'utf8');
    expect(md).not.toMatch(/\|\s*Critical\s*\|/);
  });

  it('page-controls-audit has 0 GAP-NO-HANDLER', () => {
    const csv = readFileSync(path.join(ROOT, 'audit/page-controls-audit.csv'), 'utf8');
    const gaps = csv.split('\n').filter(l => l.includes('GAP-NO-HANDLER'));
    expect(gaps).toEqual([]);
  });

  it('ui-permissions-audit has 0 GAP rows', () => {
    const csv = readFileSync(path.join(ROOT, 'audit/ui-permissions-audit.csv'), 'utf8');
    const gaps = csv.split('\n').filter(l => /,GAP-/.test(l));
    expect(gaps).toEqual([]);
  });

  it('no page imports from @/hooks/data/* (non-type)', () => {
    const offenders: string[] = [];
    const re = /^import\s+(?!type\b)[^;]*from\s+['"]@\/hooks\/data\//gm;
    for (const f of walk(path.join(SRC, 'pages'))) {
      const src = readFileSync(f, 'utf8');
      if (re.test(src)) offenders.push(path.relative(SRC, f));
      re.lastIndex = 0;
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no page imports @/integrations/supabase/client directly', () => {
    const offenders: string[] = [];
    const re = /from\s+['"]@\/integrations\/supabase\/client['"]/;
    for (const f of walk(path.join(SRC, 'pages'))) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(path.relative(SRC, f));
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no hook in hooks/data/** imports sonner', () => {
    const offenders: string[] = [];
    const re = /from\s+['"]sonner['"]/;
    for (const f of walk(path.join(SRC, 'hooks/data'))) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(path.relative(SRC, f));
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no utils/ file imports supabase or sonner', () => {
    const offenders: string[] = [];
    const re = /from\s+['"](sonner|@\/integrations\/supabase)/;
    for (const f of walk(path.join(SRC, 'utils'))) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(path.relative(SRC, f));
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no hook imports from @/pages/** (direction)', () => {
    const offenders: string[] = [];
    const re = /from\s+['"]@\/pages\//;
    for (const f of walk(path.join(SRC, 'hooks'))) {
      if (re.test(readFileSync(f, 'utf8'))) offenders.push(path.relative(SRC, f));
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
